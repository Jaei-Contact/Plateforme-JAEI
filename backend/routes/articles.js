const express = require('express');
const router  = express.Router();
const pool    = require('../db/connection');

// ────────────────────────────────────────────────────────────
// GET /api/articles/stats  — Statistiques publiques
// !! Doit être défini AVANT /:id pour éviter le conflit
// ────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [published, authors, domains, reviewers] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM submissions WHERE status = 'published'"),
      pool.query("SELECT COUNT(DISTINCT author_id) FROM submissions WHERE status = 'published'"),
      pool.query("SELECT COUNT(DISTINCT research_area) FROM submissions WHERE status = 'published' AND research_area IS NOT NULL"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'reviewer'"),
    ]);
    res.json({
      articles:  parseInt(published.rows[0].count),
      authors:   parseInt(authors.rows[0].count),
      domains:   parseInt(domains.rows[0].count),
      reviewers: parseInt(reviewers.rows[0].count),
    });
  } catch (err) {
    console.error('GET /articles/stats :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/articles  — Liste des articles publiés (public)
// ────────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { q, page = 1, limit = 12 } = req.query;
    const domainRaw = req.query.domain;
    const domains = domainRaw
      ? (Array.isArray(domainRaw) ? domainRaw : [domainRaw]).map(d => d.trim()).filter(Boolean)
      : [];

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ["s.status = 'published'"];
    const params     = [];

    if (q && q.trim()) {
      params.push(`%${q.trim()}%`);
      const n = params.length;
      conditions.push(
        `(s.title ILIKE $${n} OR s.abstract ILIKE $${n} OR s.keywords ILIKE $${n} OR (u.first_name || ' ' || u.last_name) ILIKE $${n})`
      );
    }
    if (domains.length > 0) {
      params.push(domains);
      conditions.push(`s.research_area = ANY($${params.length}::text[])`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM submissions s JOIN users u ON u.id = s.author_id ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(parseInt(limit));
    params.push(offset);
    const result = await pool.query(
      `SELECT s.id, s.title, s.abstract, s.keywords, s.research_area, s.pdf_url,
              s.submitted_at, s.updated_at, s.co_authors, s.download_count,
              s.rating_sum, s.rating_count,
              u.first_name || ' ' || u.last_name AS author_name
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       ${where}
       ORDER BY s.updated_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    res.json({
      articles: result.rows,
      pagination: { total, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(total / parseInt(limit)) },
    });
  } catch (err) {
    console.error('GET /articles :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// GET /api/articles/:id  — Détail d'un article publié
// ────────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT s.id, s.title, s.abstract, s.keywords, s.research_area, s.pdf_url,
              s.submitted_at, s.updated_at, s.co_authors,
              s.download_count, s.rating_sum, s.rating_count,
              u.id AS author_id,
              u.first_name || ' ' || u.last_name AS author_name,
              u.avatar_url AS author_avatar,
              u.institution, u.research_area AS author_domain
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       WHERE s.id = $1 AND s.status = 'published'`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Article not found or not published' });
    }

    const article = result.rows[0];

    // Stats auteur
    const authorStats = await pool.query(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'published') AS published_count,
        COUNT(*) AS total_submitted,
        COALESCE(SUM(download_count), 0) AS total_downloads
       FROM submissions
       WHERE author_id = $1`,
      [article.author_id]
    );

    // Articles connexes (même domaine)
    const related = await pool.query(
      `SELECT s.id, s.title, s.research_area,
              u.first_name || ' ' || u.last_name AS author_name
       FROM submissions s
       JOIN users u ON u.id = s.author_id
       WHERE s.status = 'published' AND s.research_area = $1 AND s.id != $2
       ORDER BY s.updated_at DESC
       LIMIT 4`,
      [article.research_area, id]
    );

    res.json({
      article,
      related:     related.rows,
      authorStats: authorStats.rows[0],
    });
  } catch (err) {
    console.error('GET /articles/:id :', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/articles/:id/download  — Incrémenter téléchargements
// ────────────────────────────────────────────────────────────
router.post('/:id/download', async (req, res) => {
  try {
    await pool.query(
      "UPDATE submissions SET download_count = download_count + 1 WHERE id = $1 AND status = 'published'",
      [req.params.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ────────────────────────────────────────────────────────────
// POST /api/articles/:id/rate  — Noter un article (1–5)
// ────────────────────────────────────────────────────────────
router.post('/:id/rate', async (req, res) => {
  try {
    const { rating } = req.body;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Invalid rating (1–5)' });
    }
    const result = await pool.query(
      `UPDATE submissions
       SET rating_sum = rating_sum + $1, rating_count = rating_count + 1
       WHERE id = $2 AND status = 'published'
       RETURNING rating_sum, rating_count`,
      [rating, req.params.id]
    );
    const row = result.rows[0];
    res.json({
      average: row.rating_count > 0 ? (row.rating_sum / row.rating_count).toFixed(1) : 0,
      count: row.rating_count,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;

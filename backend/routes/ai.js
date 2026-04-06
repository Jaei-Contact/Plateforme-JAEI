const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  suggestKeywords,
  improveAbstract,
  analyzeRelevance,
} = require('../services/aiService');

// ============================================================
// JAEI — Routes IA (OpenAI GPT-4)
// Fonctionnalités disponibles dès que OPENAI_API_KEY est défini
// ============================================================

const AI_UNAVAILABLE = { message: 'AI assistant unavailable — API key not configured', available: false };

// ── GET /api/ai/status ────────────────────────────────────────
// Vérifie si l'IA est disponible (pour affichage conditionnel côté client)
router.get('/status', (req, res) => {
  res.json({
    available: !!process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  });
});

// ── POST /api/ai/suggest-keywords ────────────────────────────
// Suggère des mots-clés à partir du titre, résumé et domaine
// Body: { title, abstract, research_area }
router.post('/suggest-keywords', verifyToken, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

  const { title, abstract, research_area } = req.body;
  if (!title || !abstract) {
    return res.status(400).json({ message: 'title and abstract are required' });
  }

  try {
    const keywords = await suggestKeywords({ title, abstract, researchArea: research_area });
    if (!keywords) return res.status(500).json({ message: 'AI error — please try again' });
    res.json({ keywords });
  } catch (err) {
    console.error('POST /ai/suggest-keywords :', err.message);
    res.status(500).json({ message: 'AI server error' });
  }
});

// ── POST /api/ai/improve-abstract ────────────────────────────
// Améliore le résumé rédigé par l'auteur
// Body: { title, abstract, research_area }
router.post('/improve-abstract', verifyToken, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

  const { title, abstract, research_area } = req.body;
  if (!title || !abstract) {
    return res.status(400).json({ message: 'title and abstract are required' });
  }

  try {
    const improved = await improveAbstract({ title, abstract, researchArea: research_area });
    if (!improved) return res.status(500).json({ message: 'AI error — please try again' });
    res.json({ improved });
  } catch (err) {
    console.error('POST /ai/improve-abstract :', err.message);
    res.status(500).json({ message: 'AI server error' });
  }
});

// ── POST /api/ai/analyze-relevance ───────────────────────────
// Analyse la pertinence thématique d'un article pour JAEI
// Body: { title, abstract, keywords, research_area }
router.post('/analyze-relevance', verifyToken, async (req, res) => {
  if (!process.env.OPENAI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

  const { title, abstract, keywords, research_area } = req.body;
  if (!title || !abstract) {
    return res.status(400).json({ message: 'title and abstract are required' });
  }

  try {
    const analysis = await analyzeRelevance({ title, abstract, keywords, researchArea: research_area });
    if (!analysis) return res.status(500).json({ message: 'AI error — please try again' });
    res.json(analysis);
  } catch (err) {
    console.error('POST /ai/analyze-relevance :', err.message);
    res.status(500).json({ message: 'AI server error' });
  }
});

module.exports = router;

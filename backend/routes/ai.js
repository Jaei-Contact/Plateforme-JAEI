const express = require('express');
const multer  = require('multer');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
  suggestKeywords,
  improveAbstract,
  analyzeRelevance,
} = require('../services/aiService');

// Multer en mémoire pour l'analyse PDF (pas de sauvegarde sur disque)
const pdfMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    file.mimetype === 'application/pdf'
      ? cb(null, true)
      : cb(new Error('Only PDF files are accepted'));
  },
});

// ============================================================
// JAEI — Routes IA (OpenAI GPT-4)
// Fonctionnalités disponibles dès que GEMINI_API_KEY est défini
// ============================================================

const AI_UNAVAILABLE = { message: 'AI assistant unavailable — API key not configured', available: false };

// ── GET /api/ai/status ────────────────────────────────────────
// Vérifie si l'IA est disponible (pour affichage conditionnel côté client)
router.get('/status', (req, res) => {
  res.json({
    available: !!process.env.GEMINI_API_KEY,
    model: 'gemini-1.5-flash',
  });
});

// ── POST /api/ai/suggest-keywords ────────────────────────────
// Suggère des mots-clés à partir du titre, résumé et domaine
// Body: { title, abstract, research_area }
router.post('/suggest-keywords', verifyToken, async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

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
  if (!process.env.GEMINI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

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
  if (!process.env.GEMINI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);

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

// ── POST /api/ai/extract-pdf ──────────────────────────────────
// Envoie le PDF directement à Gemini 1.5 Flash (multimodal natif)
// Gemini lit le PDF sans extraction de texte intermédiaire
// Multipart: field "pdf" (application/pdf)
router.post('/extract-pdf', verifyToken, pdfMemory.single('pdf'), async (req, res) => {
  if (!process.env.GEMINI_API_KEY) return res.status(503).json(AI_UNAVAILABLE);
  if (!req.file) return res.status(400).json({ message: 'No PDF file provided' });

  try {
    // ── 1. Extraire le texte du PDF via pdf-parse ─────────────
    let text = '';
    try {
      // Utiliser le chemin direct pour éviter le bug du fichier de test
      const pdfParse = require('pdf-parse/lib/pdf-parse.js');
      const data = await pdfParse(req.file.buffer);
      text = (data.text || '').trim();
    } catch (parseErr) {
      console.warn('pdf-parse failed, sending raw buffer to Gemini:', parseErr.message);
    }

    if (text.length < 100) {
      return res.status(422).json({
        message: 'Not enough text could be extracted from this PDF. It may be a scanned image or a protected file.',
      });
    }

    // Tronquer à ~8 000 caractères pour respecter les limites de tokens
    const excerpt = text.length > 8000 ? text.substring(0, 8000) + '\n[truncated]' : text;

    // ── 2. Envoyer le texte à Gemini ─────────────────────────
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are an expert scientific editor for JAEI (Journal of Agricultural and Environmental Innovation).

Analyze the following scientific article text and produce:
1. A structured abstract of 150–200 words covering: background/objective, methods, results and conclusion.
2. Exactly 6 relevant scientific keywords.

Article text:
"""
${excerpt}
"""

Reply ONLY with valid JSON in this exact format, no other text before or after:
{
  "abstract": "...",
  "keywords": ["...", "...", "...", "...", "...", "..."]
}`;

    const result = await model.generateContent(prompt);
    const raw = result.response.text().trim();

    // ── 3. Parser la réponse ──────────────────────────────────
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('AI returned unexpected format');

    const parsed = JSON.parse(jsonMatch[0]);
    const abstract = (parsed.abstract || '').trim();
    const keywords = Array.isArray(parsed.keywords)
      ? parsed.keywords.join(', ')
      : (parsed.keywords || '');

    if (!abstract) throw new Error('AI returned an empty abstract');

    console.log(`✨ AI PDF analysis OK — ${req.file.originalname} (${text.length} chars extracted)`);
    res.json({ abstract, keywords });

  } catch (err) {
    console.error('POST /ai/extract-pdf :', err.message);
    if (err instanceof SyntaxError) {
      return res.status(500).json({ message: 'AI returned an unexpected format. Please try again.' });
    }
    const detail = process.env.NODE_ENV !== 'production' ? ` (${err.message})` : '';
    res.status(500).json({ message: `Error analyzing the document. Please try again.${detail}` });
  }
});

module.exports = router;

const { GoogleGenerativeAI } = require('@google/generative-ai');

// ============================================================
// JAEI — Service IA (Google Gemini)
// Mode dégradé si GEMINI_API_KEY absent : retourne null sans erreur
// Obtenir une clé gratuite : https://aistudio.google.com/app/apikey
// ============================================================

const getModel = () => {
  if (!process.env.GEMINI_API_KEY) return null;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

const generate = async (prompt) => {
  const model = getModel();
  if (!model) return null;
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
};

/**
 * Génère un résumé IA structuré (150-200 mots) pour un article soumis.
 */
const generateArticleSummary = async ({ title, abstract, keywords, researchArea }) => {
  if (!process.env.GEMINI_API_KEY) {
    console.log('⚠️  IA : GEMINI_API_KEY non configuré — résumé IA ignoré');
    return null;
  }
  try {
    const prompt = `You are a scientific editor for JAEI (Journal of Agricultural and Environmental Innovation).
An author has submitted an article with the following information:

Title: ${title}
Research area: ${researchArea}
Keywords: ${keywords}
Author abstract: ${abstract}

Generate a structured summary of 150 to 200 words in English that:
1. Clearly presents the context and research problem
2. Describes the methodology or approach
3. States the results or expected contributions
4. Concludes on the importance for the scientific community

The summary must be academic, precise and suitable for an international scientific publication.
Reply with the summary only, no title or introduction.`;

    const summary = await generate(prompt);
    if (summary) console.log(`🤖 IA Gemini : résumé généré pour "${title}"`);
    return summary || null;
  } catch (err) {
    console.error('⚠️  IA : erreur génération résumé :', err.message);
    return null;
  }
};

/**
 * Suggère des mots-clés à partir du titre et du résumé.
 */
const suggestKeywords = async ({ title, abstract, researchArea }) => {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const prompt = `You are a scientific indexing expert for JAEI, a journal specializing in agriculture and environment.

Article information:
Title: ${title}
Research area: ${researchArea}
Abstract: ${abstract}

Suggest exactly 6 relevant keywords in English to index this article in scientific databases (Web of Science, Scopus).
Reply ONLY with a JSON array of 6 strings, no comment. Example: ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6"]`;

    const raw = await generate(prompt);
    const match = raw?.match(/\[.*\]/s);
    if (match) {
      const keywords = JSON.parse(match[0]);
      console.log(`🤖 IA Gemini : mots-clés suggérés pour "${title}"`);
      return Array.isArray(keywords) ? keywords.slice(0, 8) : null;
    }
    return null;
  } catch (err) {
    console.error('⚠️  IA : erreur suggestion mots-clés :', err.message);
    return null;
  }
};

/**
 * Améliore le résumé rédigé par l'auteur (reformulation académique).
 */
const improveAbstract = async ({ title, abstract, researchArea }) => {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const prompt = `You are a senior scientific editor for JAEI (agriculture and environment journal).

The author has written the following abstract for the article titled "${title}" (area: ${researchArea}):

---
${abstract}
---

Rewrite this abstract by improving:
- Clarity and conciseness (150-250 words maximum)
- IMRaD structure (Introduction/context, Methods, Results, Discussion/conclusion)
- Academic register and scientific precision
- Readability for an international audience

Reply only with the improved abstract, no comment or title.`;

    const improved = await generate(prompt);
    if (improved) console.log(`🤖 IA Gemini : résumé amélioré pour "${title}"`);
    return improved || null;
  } catch (err) {
    console.error('⚠️  IA : erreur amélioration résumé :', err.message);
    return null;
  }
};

/**
 * Analyse la pertinence thématique d'un article pour JAEI.
 */
const analyzeRelevance = async ({ title, abstract, keywords, researchArea }) => {
  if (!process.env.GEMINI_API_KEY) return null;
  try {
    const prompt = `You are the editor-in-chief of JAEI (Journal of Agricultural and Environmental Innovation), specialized in:
- Sustainable agriculture and agronomic innovations
- Environment, ecology and climate change
- Food security and food systems
- Soil, water and biodiversity sciences
- Agricultural policies and rural development

Evaluate the relevance of the following article for JAEI:

Title: ${title}
Declared area: ${researchArea}
Keywords: ${keywords}
Abstract: ${abstract}

Reply ONLY with a JSON object with exactly this structure:
{
  "score": <integer from 1 to 10>,
  "assessment": "<one verdict sentence in English>",
  "suggestions": "<concrete suggestions to improve relevance, or 'No suggestions' if score >= 8>"
}`;

    const raw = await generate(prompt);
    const match = raw?.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      console.log(`🤖 IA Gemini : pertinence analysée pour "${title}" — score ${result.score}/10`);
      return result;
    }
    return null;
  } catch (err) {
    console.error('⚠️  IA : erreur analyse pertinence :', err.message);
    return null;
  }
};

module.exports = {
  generateArticleSummary,
  suggestKeywords,
  improveAbstract,
  analyzeRelevance,
};

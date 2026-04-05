const OpenAI = require('openai');

// ============================================================
// JAEI — Service IA (OpenAI GPT-4)
// Mode dégradé si OPENAI_API_KEY absent : retourne null sans erreur
// ============================================================

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

/**
 * Génère un résumé IA structuré (150-200 mots) pour un article soumis.
 */
const generateArticleSummary = async ({ title, abstract, keywords, researchArea }) => {
  const client = getClient();
  if (!client) {
    console.log('⚠️  IA : OPENAI_API_KEY non configuré — résumé IA ignoré');
    return null;
  }

  try {
    const prompt = `Tu es un éditeur scientifique pour le journal JAEI (Journal of Agricultural and Environmental Innovation).
Un auteur vient de soumettre un article avec les informations suivantes :

Titre : ${title}
Domaine : ${researchArea}
Mots-clés : ${keywords}
Résumé de l'auteur : ${abstract}

Génère un résumé structuré de 150 à 200 mots en français qui :
1. Présente clairement le contexte et la problématique
2. Décrit la méthodologie ou l'approche
3. Énonce les résultats ou contributions attendues
4. Conclut sur l'importance pour la communauté scientifique

Le résumé doit être académique, précis et adapté à une publication scientifique internationale. Réponds uniquement avec le résumé, sans titre ni introduction.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 400,
      temperature: 0.4,
    });

    const summary = completion.choices[0]?.message?.content?.trim();
    console.log(`🤖 IA : résumé généré pour "${title}"`);
    return summary || null;
  } catch (err) {
    console.error('⚠️  IA : erreur génération résumé :', err.message);
    return null;
  }
};

/**
 * Suggère des mots-clés à partir du titre et du résumé.
 * @returns {Promise<string[]|null>} Tableau de 5-8 mots-clés ou null
 */
const suggestKeywords = async ({ title, abstract, researchArea }) => {
  const client = getClient();
  if (!client) return null;

  try {
    const prompt = `Tu es un expert en indexation de publications scientifiques pour le journal JAEI spécialisé en agriculture et environnement.

Voici les informations d'un article :
Titre : ${title}
Domaine : ${researchArea}
Résumé : ${abstract}

Propose exactement 6 mots-clés pertinents en français pour indexer cet article dans des bases de données scientifiques (Web of Science, Scopus).
Réponds UNIQUEMENT avec une liste JSON de 6 chaînes de caractères, sans commentaire. Exemple : ["mot1", "mot2", "mot3", "mot4", "mot5", "mot6"]`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 150,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const match = raw?.match(/\[.*\]/s);
    if (match) {
      const keywords = JSON.parse(match[0]);
      console.log(`🤖 IA : mots-clés suggérés pour "${title}"`);
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
 * @returns {Promise<string|null>}
 */
const improveAbstract = async ({ title, abstract, researchArea }) => {
  const client = getClient();
  if (!client) return null;

  try {
    const prompt = `Tu es un éditeur scientifique senior pour le journal JAEI (agriculture et environnement).

L'auteur a rédigé le résumé suivant pour son article intitulé "${title}" (domaine : ${researchArea}) :

---
${abstract}
---

Réécris ce résumé en améliorant :
- La clarté et la concision (150-250 mots maximum)
- La structure IMRaD (Introduction/contexte, Méthodes, Résultats, Discussion/conclusion)
- Le registre académique et la précision scientifique
- La lisibilité pour un lectorat international

Réponds uniquement avec le résumé amélioré, sans commentaire ni titre.`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.5,
    });

    const improved = completion.choices[0]?.message?.content?.trim();
    console.log(`🤖 IA : résumé amélioré pour "${title}"`);
    return improved || null;
  } catch (err) {
    console.error('⚠️  IA : erreur amélioration résumé :', err.message);
    return null;
  }
};

/**
 * Analyse la pertinence thématique d'un article pour JAEI.
 * @returns {Promise<{score: number, assessment: string, suggestions: string}|null>}
 */
const analyzeRelevance = async ({ title, abstract, keywords, researchArea }) => {
  const client = getClient();
  if (!client) return null;

  try {
    const prompt = `Tu es le rédacteur en chef du journal JAEI (Journal of Agricultural and Environmental Innovation), spécialisé en :
- Agriculture durable et innovations agronomiques
- Environnement, écologie et changement climatique
- Sécurité alimentaire et systèmes alimentaires
- Sciences des sols, de l'eau et de la biodiversité
- Politiques agricoles et développement rural

Évalue la pertinence de l'article suivant pour JAEI :

Titre : ${title}
Domaine déclaré : ${researchArea}
Mots-clés : ${keywords}
Résumé : ${abstract}

Réponds UNIQUEMENT avec un objet JSON ayant exactement cette structure :
{
  "score": <nombre entier de 1 à 10>,
  "assessment": "<une phrase de verdict en français>",
  "suggestions": "<conseils concrets pour améliorer la pertinence ou 'Aucune suggestion' si score >= 8>"
}`;

    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 300,
      temperature: 0.3,
    });

    const raw = completion.choices[0]?.message?.content?.trim();
    const match = raw?.match(/\{[\s\S]*\}/);
    if (match) {
      const result = JSON.parse(match[0]);
      console.log(`🤖 IA : analyse pertinence pour "${title}" — score ${result.score}/10`);
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

const OpenAI = require('openai');

// ============================================================
// JAEI — Service IA (OpenAI GPT-4)
// Génère un résumé structuré à partir des métadonnées d'un article
// Mode dégradé si OPENAI_API_KEY absent : retourne null sans erreur
// ============================================================

const getClient = () => {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
};

/**
 * Génère un résumé IA structuré (150-200 mots) pour un article soumis.
 * @param {{ title, abstract, keywords, researchArea }} article
 * @returns {Promise<string|null>} Résumé généré ou null si IA indisponible
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
    console.log(`✅ IA : résumé généré pour "${title}"`);
    return summary || null;
  } catch (err) {
    console.error('⚠️  IA : erreur génération résumé :', err.message);
    return null;
  }
};

module.exports = { generateArticleSummary };

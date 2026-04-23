// ============================================================
// JAEI — Domaines officiels de recherche
// Source : Statuts JAEI (approuvés)
// Utilisé dans : Register, SubmitArticle, AboutPage, HomePage
// ============================================================

export const DOMAIN_MAP = {
  'Agroecology and Sustainable Land Use': [
    'Agroforestry systems',
    'Soil science and fertility management',
    'Forest ecology and wildlife conservation',
    'Carbon and nitrogen cycling in terrestrial ecosystems',
    'Soil–plant interactions and nutrient dynamics',
  ],
  'Animal and Aquatic Sciences': [
    'Animal nutrition and feed science',
    'Ruminant physiology and enteric methane mitigation',
    'Gut microbiota in animals and humans',
    'Sustainable aquaculture and fisheries management',
    'Aquatic animal health, immunology, and disease control',
    'Marine biotechnology and algal cultivation',
    'Post-harvest processing of aquatic and agricultural products',
    'Food safety and quality assurance',
    'Nutritional biochemistry (with links to fruit biotechnology and gut health)',
  ],
  'Environmental Science and Pollution Control': [
    'Water and soil pollution monitoring and remediation',
    'Bioremediation technologies',
    'Advanced oxidation processes (e.g., photocatalysis)',
    'Circular economy, coastal resource governance and sustainability',
  ],
  'Biotechnology and Biochemistry': [
    'Plant and fruit tree biotechnology',
    'Carbohydrate chemistry and metabolism',
    'Microbial cell culture and in vitro fermentation techniques',
  ],
  'Socio-Economic and Policy Dimensions of Natural Resource Use': [
    'Socio-economic surveys in livestock and fisheries systems',
    'Community-based natural resource management',
    'Policy and governance in agriculture, forestry, and fisheries',
  ],
  'Interdisciplinary and Emerging Areas': [
    'One health (linking animal, human, and environmental health via microbiota and sustainability)',
    'Climate-smart agriculture and mitigation strategies (e.g., methane reduction)',
  ],
  'Language, Communication, and Knowledge Translation': [
    'Scientific communication in multilingual contexts',
    'Translation of environmental and agricultural knowledge',
    'Cognitive and cultural aspects of technical translation',
  ],
};

// Liste des 7 domaines principaux (pour le formulaire d'inscription)
export const MAIN_DOMAINS = Object.keys(DOMAIN_MAP);

// ============================================================
// Correspondances legacy → nouveau domaine principal
// Couvre les utilisateurs créés avec l'ancienne taxonomie
// (4 groupes × sous-options) avant la refonte JAEI officielle
// ============================================================
export const LEGACY_DOMAIN_MAP = {
  // ── Ancien groupe "Agroecology and Sustainable Land Use" ──
  'Agronomy':                       'Agroecology and Sustainable Land Use',
  'Agroforestry':                   'Agroecology and Sustainable Land Use',
  'Plant genetics':                 'Agroecology and Sustainable Land Use',
  'Crop production':                'Agroecology and Sustainable Land Use',
  'Soil science':                   'Agroecology and Sustainable Land Use',
  'Plant pathology':                'Agroecology and Sustainable Land Use',
  'Rural engineering & Hydraulics': 'Agroecology and Sustainable Land Use',
  'Rural development':              'Agroecology and Sustainable Land Use',
  'Forestry':                       'Agroecology and Sustainable Land Use',

  // ── Ancien groupe "Animal and Aquatic Sciences" ──
  'Aquaculture & Fisheries':        'Animal and Aquatic Sciences',
  'Animal nutrition':               'Animal and Aquatic Sciences',
  'Animal production':              'Animal and Aquatic Sciences',
  'Veterinary parasitology':        'Animal and Aquatic Sciences',
  'Animal husbandry':               'Animal and Aquatic Sciences',

  // ── Ancien groupe "Environmental Sciences and Pollution" ──
  'Ecology':                        'Environmental Science and Pollution Control',
  'Environment & Pollution':        'Environmental Science and Pollution Control',
  'Water sciences':                 'Environmental Science and Pollution Control',
  'Climate change & Agriculture':   'Interdisciplinary and Emerging Areas',
  'Natural resource management':    'Socio-Economic and Policy Dimensions of Natural Resource Use',
  // Label d'optgroup parfois sauvegardé directement
  'Environmental Sciences and Pollution': 'Environmental Science and Pollution Control',

  // ── Ancien groupe "Biotechnology and Agricultural Innovation" ──
  'Agricultural biotechnology':     'Biotechnology and Biochemistry',
  'Soil microbiology':              'Biotechnology and Biochemistry',
  'Agricultural economics':         'Socio-Economic and Policy Dimensions of Natural Resource Use',
  // Label d'optgroup parfois sauvegardé directement
  'Biotechnology and Agricultural Innovation': 'Biotechnology and Biochemistry',
};

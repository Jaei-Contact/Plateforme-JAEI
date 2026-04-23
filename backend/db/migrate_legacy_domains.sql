-- ============================================================
-- Migration : ancienne taxonomie → nouvelle taxonomie JAEI officielle
-- À exécuter UNE SEULE FOIS sur la base de données de production
-- Affecte : users.research_area + submissions.research_area
-- ============================================================

-- ── Groupe 1 : Agroecology and Sustainable Land Use ──────────
UPDATE users SET research_area = 'Agroecology and Sustainable Land Use'
WHERE research_area IN (
  'Agronomy', 'Agroforestry', 'Plant genetics', 'Crop production',
  'Soil science', 'Plant pathology', 'Rural engineering & Hydraulics',
  'Rural development', 'Forestry'
);

UPDATE submissions SET research_area = 'Agroecology and Sustainable Land Use'
WHERE research_area IN (
  'Agronomy', 'Agroforestry', 'Plant genetics', 'Crop production',
  'Soil science', 'Plant pathology', 'Rural engineering & Hydraulics',
  'Rural development', 'Forestry'
);

-- ── Groupe 2 : Animal and Aquatic Sciences ───────────────────
UPDATE users SET research_area = 'Animal and Aquatic Sciences'
WHERE research_area IN (
  'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
  'Veterinary parasitology', 'Animal husbandry'
);

UPDATE submissions SET research_area = 'Animal and Aquatic Sciences'
WHERE research_area IN (
  'Aquaculture & Fisheries', 'Animal nutrition', 'Animal production',
  'Veterinary parasitology', 'Animal husbandry'
);

-- ── Groupe 3 : Environmental Science and Pollution Control ───
UPDATE users SET research_area = 'Environmental Science and Pollution Control'
WHERE research_area IN (
  'Ecology', 'Environment & Pollution', 'Water sciences',
  'Environmental Sciences and Pollution'
);

UPDATE submissions SET research_area = 'Environmental Science and Pollution Control'
WHERE research_area IN (
  'Ecology', 'Environment & Pollution', 'Water sciences',
  'Environmental Sciences and Pollution'
);

-- ── Groupe 4 : Interdisciplinary and Emerging Areas ──────────
UPDATE users SET research_area = 'Interdisciplinary and Emerging Areas'
WHERE research_area IN ('Climate change & Agriculture');

UPDATE submissions SET research_area = 'Interdisciplinary and Emerging Areas'
WHERE research_area IN ('Climate change & Agriculture');

-- ── Groupe 5 : Socio-Economic and Policy Dimensions ──────────
UPDATE users SET research_area = 'Socio-Economic and Policy Dimensions of Natural Resource Use'
WHERE research_area IN (
  'Natural resource management', 'Agricultural economics'
);

UPDATE submissions SET research_area = 'Socio-Economic and Policy Dimensions of Natural Resource Use'
WHERE research_area IN (
  'Natural resource management', 'Agricultural economics'
);

-- ── Groupe 6 : Biotechnology and Biochemistry ────────────────
UPDATE users SET research_area = 'Biotechnology and Biochemistry'
WHERE research_area IN (
  'Agricultural biotechnology', 'Soil microbiology',
  'Biotechnology and Agricultural Innovation'
);

UPDATE submissions SET research_area = 'Biotechnology and Biochemistry'
WHERE research_area IN (
  'Agricultural biotechnology', 'Soil microbiology',
  'Biotechnology and Agricultural Innovation'
);

-- ── Vérification post-migration ──────────────────────────────
SELECT 'users' AS table_name, research_area, COUNT(*) AS nb
FROM users
GROUP BY research_area
ORDER BY nb DESC;

SELECT 'submissions' AS table_name, research_area, COUNT(*) AS nb
FROM submissions
GROUP BY research_area
ORDER BY nb DESC;

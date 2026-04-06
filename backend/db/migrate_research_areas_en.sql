-- Migration: translate French research_area values to English
-- in submissions table (and users.research_area if it exists)
-- Safe to run multiple times (CASE only updates matching rows)

UPDATE submissions SET research_area = CASE research_area
  -- Agroecology and Sustainable Land Use
  WHEN 'Agronomie'                        THEN 'Agronomy'
  WHEN 'Agroforesterie'                   THEN 'Agroforestry'
  WHEN 'Génétique des plantes'            THEN 'Plant genetics'
  WHEN 'Productions végétales'            THEN 'Crop production'
  WHEN 'Sciences du sol'                  THEN 'Soil science'
  WHEN 'Phytopathologie'                  THEN 'Plant pathology'
  WHEN 'Génie rural & Hydraulique'        THEN 'Rural engineering & Hydraulics'
  WHEN 'Développement rural'              THEN 'Rural development'
  -- Animal and Aquatic Sciences
  WHEN 'Aquaculture & Pêche'              THEN 'Aquaculture & Fisheries'
  WHEN 'Nutrition animale'                THEN 'Animal nutrition'
  WHEN 'Productions animales'             THEN 'Animal production'
  WHEN 'Parasitologie vétérinaire'        THEN 'Veterinary parasitology'
  WHEN 'Zootechnie'                       THEN 'Animal husbandry'
  -- Environmental Sciences and Pollution
  WHEN 'Écologie'                         THEN 'Ecology'
  WHEN 'Environnement & Pollution'        THEN 'Environment & Pollution'
  WHEN 'Changement climatique & Agriculture' THEN 'Climate change & Agriculture'
  WHEN 'Foresterie'                       THEN 'Forestry'
  WHEN 'Gestion des ressources naturelles' THEN 'Natural resource management'
  WHEN 'Sciences de l''eau'              THEN 'Water sciences'
  -- Biotechnology and Agricultural Innovation
  WHEN 'Biotechnologie agricole'          THEN 'Agricultural biotechnology'
  WHEN 'Microbiologie du sol'             THEN 'Soil microbiology'
  WHEN 'Économie agricole'               THEN 'Agricultural economics'
  ELSE research_area
END
WHERE research_area IN (
  'Agronomie','Agroforesterie','Génétique des plantes','Productions végétales',
  'Sciences du sol','Phytopathologie','Génie rural & Hydraulique','Développement rural',
  'Aquaculture & Pêche','Nutrition animale','Productions animales',
  'Parasitologie vétérinaire','Zootechnie',
  'Écologie','Environnement & Pollution','Changement climatique & Agriculture',
  'Foresterie','Gestion des ressources naturelles','Sciences de l''eau',
  'Biotechnologie agricole','Microbiologie du sol','Économie agricole'
);

-- Same for users.research_area if the column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'research_area'
  ) THEN
    UPDATE users SET research_area = CASE research_area
      WHEN 'Agronomie'                        THEN 'Agronomy'
      WHEN 'Agroforesterie'                   THEN 'Agroforestry'
      WHEN 'Génétique des plantes'            THEN 'Plant genetics'
      WHEN 'Productions végétales'            THEN 'Crop production'
      WHEN 'Sciences du sol'                  THEN 'Soil science'
      WHEN 'Phytopathologie'                  THEN 'Plant pathology'
      WHEN 'Génie rural & Hydraulique'        THEN 'Rural engineering & Hydraulics'
      WHEN 'Développement rural'              THEN 'Rural development'
      WHEN 'Aquaculture & Pêche'              THEN 'Aquaculture & Fisheries'
      WHEN 'Nutrition animale'                THEN 'Animal nutrition'
      WHEN 'Productions animales'             THEN 'Animal production'
      WHEN 'Parasitologie vétérinaire'        THEN 'Veterinary parasitology'
      WHEN 'Zootechnie'                       THEN 'Animal husbandry'
      WHEN 'Écologie'                         THEN 'Ecology'
      WHEN 'Environnement & Pollution'        THEN 'Environment & Pollution'
      WHEN 'Changement climatique & Agriculture' THEN 'Climate change & Agriculture'
      WHEN 'Foresterie'                       THEN 'Forestry'
      WHEN 'Gestion des ressources naturelles' THEN 'Natural resource management'
      WHEN 'Sciences de l''eau'              THEN 'Water sciences'
      WHEN 'Biotechnologie agricole'          THEN 'Agricultural biotechnology'
      WHEN 'Microbiologie du sol'             THEN 'Soil microbiology'
      WHEN 'Économie agricole'               THEN 'Agricultural economics'
      ELSE research_area
    END
    WHERE research_area IN (
      'Agronomie','Agroforesterie','Génétique des plantes','Productions végétales',
      'Sciences du sol','Phytopathologie','Génie rural & Hydraulique','Développement rural',
      'Aquaculture & Pêche','Nutrition animale','Productions animales',
      'Parasitologie vétérinaire','Zootechnie',
      'Écologie','Environnement & Pollution','Changement climatique & Agriculture',
      'Foresterie','Gestion des ressources naturelles','Sciences de l''eau',
      'Biotechnologie agricole','Microbiologie du sol','Économie agricole'
    );
  END IF;
END $$;

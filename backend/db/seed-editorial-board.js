// ============================================================
// Seed — Comité éditorial (table editorial_members)
// ------------------------------------------------------------
// Remplit la table avec les 6 membres officiels du comité.
// IDEMPOTENT : un membre déjà présent (même nom) est ignoré,
// donc le script peut être relancé sans créer de doublons.
//
// Usage :
//   • Base définie par .env (local)  : node db/seed-editorial-board.js
//   • Base Neon (prod)               : DATABASE_URL="postgresql://…" node db/seed-editorial-board.js
//
// Source des données : FALLBACK_EDITORS de frontend/src/pages/public/HomePage.jsx
// (les noms sont STRICTEMENT identiques pour que l'accueil ré-associe
//  correctement les photos par nom).
// ============================================================

const path = require('path');
// Charge le .env local explicitement (indépendant du cwd). Si DATABASE_URL
// est déjà fourni par le shell (cas Neon/prod), dotenv ne l'écrase pas.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const pool = require('./connection');

const MEMBERS = [
  ['Editor-in-Chief',    'Dr. Mbezele Junior Yannick Ngaba',    'Forest Soils and Nutrient Dynamics; Carbon and Nitrogen Fluxes in Agroforestry Ecosystems; Soil Biochemistry and Soil-Plant Relations; Forest Ecology and Wildlife Management', 1],
  ['Co-Editor-in-Chief', 'Dr. Aurele Gnetegha Ayemele',         'Animal Nutrition, Feed Science and Microbiome; In vitro Fermentation; Enteric Methane Mitigation; Socio-economic Studies', 2],
  ['Co-Editor-in-Chief', 'Dr. David Mahoudjro Boujrenou',       'Fruit Tree Biotechnology; Carbohydrate Chemistry; Exo-vivo Fermentations; Animal and Human Gut Microbiota', 3],
  ['Co-Editor-in-Chief', 'Dr. Moussa Gouife',                   'Sustainable Aquaculture and Fisheries Systems; Aquatic Animal Health; Marine Biotechnology; Fisheries Ecology; Blue Economy Development', 4],
  ['Co-Editor-in-Chief', 'Dr. Olive Mekontchou Yemele',         'Water and Soil Pollution Control; Bioremediation; Bioelectrochemistry; Photocatalysis', 5],
  ['Co-Editor-in-Chief', 'Dr. Yvan Rudhel Megaptche Megaptche', 'Applied Linguistics; Translation Studies; Cognitive Linguistics; Cognitive Translation; Cultural Linguistics; Metaphor Translation', 6],
];

(async () => {
  const target = process.env.DATABASE_URL ? 'Neon / DATABASE_URL' : 'base locale (.env)';
  console.log(`\n🌱 Seed comité éditorial → ${target}\n`);

  try {
    let inserted = 0;
    let skipped  = 0;

    for (const [role, name, affiliation, sort_order] of MEMBERS) {
      const res = await pool.query(
        `INSERT INTO editorial_members (role, name, affiliation, sort_order)
         SELECT $1::text, $2::text, $3::text, $4::int
         WHERE NOT EXISTS (SELECT 1 FROM editorial_members WHERE name = $2::text)
         RETURNING id`,
        [role, name, affiliation, sort_order]
      );
      if (res.rowCount > 0) { inserted++; console.log(`  ✅ Ajouté   : ${name}`); }
      else                  { skipped++;  console.log(`  ⏭️  Déjà là  : ${name}`); }
    }

    const { rows } = await pool.query(
      'SELECT id, role, name, sort_order FROM editorial_members ORDER BY sort_order, id'
    );

    console.log(`\n📊 Résultat : ${inserted} ajouté(s), ${skipped} déjà présent(s).`);
    console.log(`👥 Total en base : ${rows.length} membre(s)`);
    console.table(rows.map(r => ({ id: r.id, role: r.role, name: r.name, order: r.sort_order })));

    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seed échoué :', err.message);
    try { await pool.end(); } catch { /* ignore */ }
    process.exit(1);
  }
})();

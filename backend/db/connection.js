const { Pool } = require('pg');
require('dotenv').config();

// En production (Render) : DATABASE_URL fournie automatiquement
// En développement : variables individuelles
const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    })
  : new Pool({
      user:     process.env.DATABASE_USER,
      host:     process.env.DATABASE_HOST,
      database: process.env.DATABASE_NAME,
      password: process.env.DATABASE_PASSWORD,
      port:     process.env.DATABASE_PORT,
    });

// Empêche qu'une erreur sur un client inactif (perte réseau, DB redémarrée…)
// ne fasse crasher tout le process Node. On log et le pool se rétablit seul.
pool.on('error', (err) => {
  console.error('❌ Erreur inattendue du pool PostgreSQL (client inactif):', err.message);
});

// Test de connexion au démarrage (non bloquant)
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Database connection error:', err.message);
    console.error('   → Host injoignable ? Vérifie DATABASE_URL (utilise l\'URL EXTERNE Render).');
  } else {
    console.log('✅ Database connected at:', res.rows[0].now);
  }
});

module.exports = pool;
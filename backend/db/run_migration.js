const pool = require('./connection');

async function migrate() {
  const queries = [
    "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS download_count INT DEFAULT 0",
    "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rating_sum FLOAT DEFAULT 0",
    "ALTER TABLE submissions ADD COLUMN IF NOT EXISTS rating_count INT DEFAULT 0",
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
  ];
  for (const q of queries) {
    await pool.query(q);
    console.log('OK:', q.slice(0, 60));
  }
  console.log('Migration terminée.');
  process.exit(0);
}

migrate().catch(e => { console.error(e.message); process.exit(1); });

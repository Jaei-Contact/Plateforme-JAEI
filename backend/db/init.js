const pool = require('./connection');

// ============================================================
// JAEI — Initialisation automatique de la base de données
// Crée toutes les tables si elles n'existent pas encore
// Exécuté au démarrage du serveur (server.js)
// ============================================================

const initDB = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── USERS ──────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id           SERIAL PRIMARY KEY,
        email        VARCHAR(255) NOT NULL UNIQUE,
        password     VARCHAR(255) NOT NULL,
        role         VARCHAR(50)  NOT NULL DEFAULT 'author',
        first_name   VARCHAR(100),
        last_name    VARCHAR(100),
        institution  TEXT,
        country      TEXT,
        research_area TEXT,
        avatar_url   TEXT,
        reset_token         VARCHAR(255),
        reset_token_expiry  TIMESTAMP,
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── RESEARCH AREAS ─────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS research_areas (
        id          SERIAL PRIMARY KEY,
        name        VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Seed initial si vide
    await client.query(`
      INSERT INTO research_areas (name, description) VALUES
        ('Agroecology and Sustainable Land Use',     'Agroforestry, soil science, forest ecology, carbon cycling'),
        ('Animal and Aquatic Sciences',              'Animal nutrition, aquaculture, marine biotechnology, food safety'),
        ('Environmental Science and Pollution',      'Pollution monitoring, waste management, climate change'),
        ('Biotechnology and Agricultural Innovation','GMOs, precision agriculture, biopesticides, crop improvement')
      ON CONFLICT (name) DO NOTHING
    `);

    // ── SUBMISSIONS ────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id              SERIAL PRIMARY KEY,
        title           VARCHAR(500) NOT NULL,
        abstract        TEXT         NOT NULL,
        keywords        TEXT,
        research_area   TEXT,
        pdf_url         VARCHAR(500),
        author_id       INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status          VARCHAR(50) DEFAULT 'pending',
        editor_comment  TEXT,
        download_count  INT DEFAULT 0,
        rating_sum      FLOAT DEFAULT 0,
        rating_count    INT DEFAULT 0,
        submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── REVIEWS ────────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id              SERIAL PRIMARY KEY,
        submission_id   INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
        reviewer_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
        status          VARCHAR(50) DEFAULT 'pending',
        comments        TEXT,
        recommendation  VARCHAR(50),
        reviewed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── PUBLISHED ARTICLES ─────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS published_articles (
        id            SERIAL PRIMARY KEY,
        submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT,
        doi           VARCHAR(255),
        views         INTEGER DEFAULT 0,
        published_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // ── PAYMENTS ───────────────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id             SERIAL PRIMARY KEY,
        user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
        submission_id  INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
        amount         NUMERIC(10,2) NOT NULL,
        currency       VARCHAR(10) DEFAULT 'XAF',
        payment_method VARCHAR(50) DEFAULT 'cinetpay',
        transaction_id VARCHAR(255) UNIQUE,
        status         VARCHAR(50) DEFAULT 'pending',
        paid_at        TIMESTAMP,
        created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Contrainte unicité soumission + méthode
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'payments_submission_method_unique'
        ) THEN
          ALTER TABLE payments ADD CONSTRAINT payments_submission_method_unique
            UNIQUE (submission_id, payment_method);
        END IF;
      END $$
    `);

    // ── EDITORIAL MEMBERS ──────────────────────────────────────
    await client.query(`
      CREATE TABLE IF NOT EXISTS editorial_members (
        id          SERIAL PRIMARY KEY,
        role        VARCHAR(100)  NOT NULL,
        name        VARCHAR(200)  NOT NULL,
        affiliation VARCHAR(300),
        sort_order  INTEGER       DEFAULT 0,
        created_at  TIMESTAMP     DEFAULT NOW(),
        updated_at  TIMESTAMP     DEFAULT NOW()
      )
    `);

    // ── EMAIL VERIFICATION (migration safe) ────────────────────
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS email_verified          BOOLEAN   DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS verification_token      VARCHAR(255),
        ADD COLUMN IF NOT EXISTS verification_token_expires TIMESTAMP
    `);

    // ── SUBMISSIONS — colonnes wizard v2 (migration safe) ──────
    await client.query(`
      ALTER TABLE submissions
        ADD COLUMN IF NOT EXISTS article_type    VARCHAR(100),
        ADD COLUMN IF NOT EXISTS cover_letter    TEXT,
        ADD COLUMN IF NOT EXISTS ai_declaration  BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS co_authors      TEXT
    `);

    // ── RÉTROCOMPATIBILITÉ — auto-vérifier les comptes legacy ──
    // Les utilisateurs créés AVANT le système de vérification n'ont pas de
    // verification_token → on les considère comme vérifiés automatiquement.
    await client.query(`
      UPDATE users
         SET email_verified = TRUE
       WHERE email_verified = FALSE
         AND verification_token IS NULL
    `);

    await client.query('COMMIT');
    console.log('✅ Database initialized — all tables ready');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Database initialization error:', err.message);
  } finally {
    client.release();
  }
};

module.exports = initDB;

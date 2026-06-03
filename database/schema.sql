-- ============================================================
-- JAEI Platform — Database Schema (reference)
-- PostgreSQL
-- ⚠️  Source of truth for the DB is backend/db/init.js
--     This file is kept in sync for documentation purposes.
-- Last updated: 2026-06
-- ============================================================

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id                          SERIAL PRIMARY KEY,
  email                       VARCHAR(255) NOT NULL UNIQUE,
  password                    VARCHAR(255) NOT NULL,
  role                        VARCHAR(50)  NOT NULL DEFAULT 'author',
  first_name                  VARCHAR(100),
  last_name                   VARCHAR(100),
  institution                 TEXT,
  country                     TEXT,
  research_area               TEXT,
  avatar_url                  TEXT,
  reset_token                 VARCHAR(255),
  reset_token_expires         TIMESTAMP,
  email_verified              BOOLEAN   DEFAULT FALSE,
  verification_token          VARCHAR(255),
  verification_token_expires  TIMESTAMP,
  created_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at                  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- RESEARCH AREAS
CREATE TABLE IF NOT EXISTS research_areas (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- SUBMISSIONS
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
  article_type    VARCHAR(100),
  cover_letter    TEXT,
  ai_declaration  BOOLEAN DEFAULT FALSE,
  ai_summary      TEXT,
  co_authors      TEXT,
  download_count  INT   DEFAULT 0,
  rating_sum      FLOAT DEFAULT 0,
  rating_count    INT   DEFAULT 0,
  submitted_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- REVIEWS
CREATE TABLE IF NOT EXISTS reviews (
  id              SERIAL PRIMARY KEY,
  submission_id   INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id     INTEGER REFERENCES users(id)       ON DELETE CASCADE,
  status          VARCHAR(50) DEFAULT 'pending',
  comments        TEXT,
  recommendation  VARCHAR(50),
  reviewed_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PUBLISHED ARTICLES (view layer — not the primary source of truth)
CREATE TABLE IF NOT EXISTS published_articles (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT,
  doi           VARCHAR(255),
  views         INTEGER DEFAULT 0,
  published_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id)       ON DELETE CASCADE,
  submission_id  INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL,
  currency       VARCHAR(10) DEFAULT 'XAF',
  payment_method VARCHAR(50) DEFAULT 'cinetpay',
  transaction_id VARCHAR(255) UNIQUE,
  status         VARCHAR(50) DEFAULT 'pending',
  paid_at        TIMESTAMP,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_submission_method_unique UNIQUE (submission_id, payment_method)
);

-- EDITORIAL MEMBERS
CREATE TABLE IF NOT EXISTS editorial_members (
  id          SERIAL PRIMARY KEY,
  role        VARCHAR(100) NOT NULL,
  name        VARCHAR(200) NOT NULL,
  affiliation VARCHAR(300),
  sort_order  INTEGER      DEFAULT 0,
  created_at  TIMESTAMP    DEFAULT NOW(),
  updated_at  TIMESTAMP    DEFAULT NOW()
);

-- ============================================================
-- RECOMMENDED INDEXES (performance at scale)
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_submissions_author_id    ON submissions(author_id);
CREATE INDEX IF NOT EXISTS idx_submissions_status       ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_reviews_submission_id    ON reviews(submission_id);
CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id      ON reviews(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id         ON payments(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction_id  ON payments(transaction_id);

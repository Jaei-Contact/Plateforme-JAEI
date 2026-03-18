-- ============================================================
-- JAEI Platform — Database Schema
-- PostgreSQL
-- ============================================================

-- USERS
CREATE TABLE users (
  id         SERIAL PRIMARY KEY,
  email      VARCHAR(255) NOT NULL UNIQUE,
  password   VARCHAR(255) NOT NULL,
  role       VARCHAR(50)  NOT NULL,
  first_name VARCHAR(100),
  last_name  VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT users_role_check CHECK (role = ANY (ARRAY['author','reviewer','admin','reader']))
);

-- RESEARCH AREAS
CREATE TABLE research_areas (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO research_areas (name, description) VALUES
  ('Agroecology and Sustainable Land Use',    'Agroforestry, soil science, forest ecology, carbon cycling, soil-plant interactions'),
  ('Animal and Aquatic Sciences',             'Animal nutrition, ruminant physiology, aquaculture, marine biotechnology, food safety'),
  ('Environmental Science and Pollution',     'Pollution monitoring, waste management, climate change, ecosystem restoration'),
  ('Biotechnology and Agricultural Innovation','GMOs, precision agriculture, biopesticides, crop improvement, agri-tech');

-- SUBMISSIONS
CREATE TABLE submissions (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(500) NOT NULL,
  abstract     TEXT         NOT NULL,
  keywords     TEXT,
  pdf_url      VARCHAR(500),
  author_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(50) DEFAULT 'pending',
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT submissions_status_check CHECK (status = ANY (ARRAY[
    'pending','under_review','revised','accepted','rejected','published'
  ]))
);

-- REVIEWS
CREATE TABLE reviews (
  id             SERIAL PRIMARY KEY,
  submission_id  INTEGER REFERENCES submissions(id) ON DELETE CASCADE,
  reviewer_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  comments       TEXT,
  recommendation VARCHAR(50),
  reviewed_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT reviews_recommendation_check CHECK (recommendation = ANY (ARRAY[
    'accept','minor_revisions','major_revisions','reject'
  ]))
);

-- PUBLISHED ARTICLES
CREATE TABLE published_articles (
  id            SERIAL PRIMARY KEY,
  submission_id INTEGER NOT NULL UNIQUE REFERENCES submissions(id) ON DELETE RESTRICT,
  doi           VARCHAR(255),
  views         INTEGER DEFAULT 0,
  published_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PAYMENTS
CREATE TABLE payments (
  id             SERIAL PRIMARY KEY,
  user_id        INTEGER REFERENCES users(id) ON DELETE CASCADE,
  submission_id  INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  amount         NUMERIC(10,2) NOT NULL,
  currency       VARCHAR(10) DEFAULT 'XAF',
  payment_method VARCHAR(50),
  transaction_id VARCHAR(255) UNIQUE,
  status         VARCHAR(50) DEFAULT 'pending',
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT payments_method_check CHECK (payment_method = ANY (ARRAY['orange_money','mtn_momo','stripe'])),
  CONSTRAINT payments_status_check CHECK (status = ANY (ARRAY['pending','completed','failed','refunded']))
);

-- Migration: mise à jour table payments + submissions pour Stripe
-- À exécuter une seule fois sur la base de données JAEI

-- Ajouter colonnes manquantes à payments si elles n'existent pas
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'XAF';

-- Contrainte unicité pour l'upsert ON CONFLICT dans payments.js
-- (une seule entrée par soumission + méthode de paiement)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'payments_submission_method_unique'
  ) THEN
    ALTER TABLE payments ADD CONSTRAINT payments_submission_method_unique
      UNIQUE (submission_id, payment_method);
  END IF;
END $$;

-- Ajouter colonne editor_comment à submissions si elle n'existe pas
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS editor_comment TEXT;

-- Remboursements (préparation Stripe — Commentaire 2 du client, tâche "Rembourser")
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_amount NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at      TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_reason    TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

-- Facturation (Commentaire 2 du client) — voir docs/PAIEMENTS-PREPARATION.md
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;
CREATE TABLE IF NOT EXISTS invoices (
  id             SERIAL PRIMARY KEY,
  payment_id     INTEGER REFERENCES payments(id) ON DELETE SET NULL,
  submission_id  INTEGER REFERENCES submissions(id) ON DELETE SET NULL,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount         NUMERIC(10,2) NOT NULL,
  currency       VARCHAR(10) DEFAULT 'XAF',
  tax_label      VARCHAR(100),
  tax_amount     NUMERIC(10,2) DEFAULT 0,
  payer_name     VARCHAR(255),
  payer_email    VARCHAR(255),
  pdf_url        VARCHAR(500),
  issued_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ajouter statut 'revision_needed' et 'submitted' si contrainte CHECK existe
-- (si pas de contrainte CHECK sur status, ces lignes sont ignorées)
DO $$
BEGIN
  -- Supprimer l'ancienne contrainte si elle existe
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'submissions_status_check'
  ) THEN
    ALTER TABLE submissions DROP CONSTRAINT submissions_status_check;
    ALTER TABLE submissions ADD CONSTRAINT submissions_status_check
      CHECK (status IN ('pending','submitted','under_review','revision_needed','revised','accepted','rejected','published'));
  END IF;
END $$;

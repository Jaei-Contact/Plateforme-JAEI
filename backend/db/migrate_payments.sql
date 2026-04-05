-- Migration: mise à jour table payments + submissions pour Stripe
-- À exécuter une seule fois sur la base de données JAEI

-- Ajouter colonnes manquantes à payments si elles n'existent pas
ALTER TABLE payments ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();
ALTER TABLE payments ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'XOF';

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

-- Migration: add profile columns to users table
-- Safe to run multiple times (IF NOT EXISTS)

ALTER TABLE users ADD COLUMN IF NOT EXISTS institution TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS research_area TEXT;

-- Migration: Add phone verification + WhatsApp opt-in to users (#27, #46, #80)
-- Run at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
-- Date: 2026-05-08

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone            TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in  BOOLEAN DEFAULT false;

-- Index for WhatsApp notification fan-out queries
CREATE INDEX IF NOT EXISTS idx_users_whatsapp ON users (phone_verified, whatsapp_opt_in)
  WHERE phone_verified = true AND whatsapp_opt_in = true;

-- Index for looking up users by phone (for admin dedup)
CREATE INDEX IF NOT EXISTS idx_users_phone ON users (phone)
  WHERE phone IS NOT NULL;

-- Rollback script (save separately):
-- ALTER TABLE users DROP COLUMN IF EXISTS phone;
-- ALTER TABLE users DROP COLUMN IF EXISTS phone_verified;
-- ALTER TABLE users DROP COLUMN IF EXISTS whatsapp_opt_in;
-- DROP INDEX IF EXISTS idx_users_whatsapp;
-- DROP INDEX IF EXISTS idx_users_phone;

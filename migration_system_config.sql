-- migration_system_config.sql
-- Creates the system_config key-value table used for persisting
-- global state such as the round-robin assignment index (#40).
-- Run this once against your Supabase project.

CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed the round-robin index at 0 so the first auto-assign picks member[0].
INSERT INTO system_config (key, value, updated_at)
VALUES ('round_robin_index', '0', now())
ON CONFLICT (key) DO NOTHING;

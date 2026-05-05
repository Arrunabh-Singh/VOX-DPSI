-- ── Migration: Task #24 — Term-limit Tracking for Council Members ─────────────
-- Adds term_start / term_end columns to users so tenure can be tracked.
-- Also adds a notification preference flag for term-expiry alerts.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS term_start DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS term_end   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS term_role  TEXT DEFAULT NULL;  -- e.g. 'House Captain', 'School President'

-- Index for fast expiry queries (used by daily cron)
CREATE INDEX IF NOT EXISTS idx_users_term_end
  ON users (term_end)
  WHERE term_end IS NOT NULL AND role IN ('council_member', 'supervisor');

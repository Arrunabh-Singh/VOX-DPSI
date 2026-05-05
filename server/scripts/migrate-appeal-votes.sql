-- Migration: Add dual-vote columns to appeals table
-- Run in Supabase SQL Editor

ALTER TABLE appeals
  ADD COLUMN IF NOT EXISTS council_vote        TEXT CHECK (council_vote IN ('uphold','reject')),
  ADD COLUMN IF NOT EXISTS council_vote_note   TEXT,
  ADD COLUMN IF NOT EXISTS council_voter_id    UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS supervisor_vote     TEXT CHECK (supervisor_vote IN ('uphold','reject')),
  ADD COLUMN IF NOT EXISTS supervisor_vote_note TEXT,
  ADD COLUMN IF NOT EXISTS supervisor_voter_id  UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS supervisor_voter_label TEXT;

-- Update old pending appeals to also accept 'voting' status
ALTER TABLE appeals DROP CONSTRAINT IF EXISTS appeals_status_check;
ALTER TABLE appeals
  ADD CONSTRAINT appeals_status_check
  CHECK (status IN ('pending','voting','upheld','rejected'));

-- Confirm
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'appeals' ORDER BY ordinal_position;

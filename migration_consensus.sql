-- ── Migration: Task #21 — Voting / Consensus on Sensitive Cases ──────────────
-- For complaints in 'behaviour' or 'personal' domain, resolution requires
-- a minimum of 2 council member votes before the complaint can be marked resolved.

-- Consensus votes table
CREATE TABLE IF NOT EXISTS complaint_votes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  voter_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote          TEXT        NOT NULL CHECK (vote IN ('approve', 'reject')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE (complaint_id, voter_id)  -- one vote per person per complaint
);

CREATE INDEX IF NOT EXISTS idx_complaint_votes_complaint ON complaint_votes (complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_votes_voter     ON complaint_votes (voter_id);

-- Add consensus tracking columns to complaints
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS consensus_required       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS consensus_status         TEXT        DEFAULT NULL
    CHECK (consensus_status IN ('voting', 'approved', 'rejected', NULL)),
  ADD COLUMN IF NOT EXISTS consensus_requested_by   UUID        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS consensus_requested_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consensus_resolution_note TEXT       DEFAULT NULL;

-- Backfill: auto-flag existing sensitive complaints
UPDATE complaints
  SET consensus_required = true
  WHERE domain IN ('behaviour', 'personal')
    AND status NOT IN ('resolved', 'closed');

-- RLS
ALTER TABLE complaint_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON complaint_votes
  FOR ALL TO service_role USING (true) WITH CHECK (true);

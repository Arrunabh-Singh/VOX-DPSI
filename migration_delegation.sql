-- ── Migration: Task #20 — Role-based Delegation ──────────────────────────────
-- Creates the delegation_rules table so council members can temporarily hand off
-- their complaints to a colleague during exams, illness, or leave.
-- Principals and coordinators can also force-delegate.

CREATE TABLE IF NOT EXISTS delegation_rules (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  delegator_id  UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delegate_id   UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_date    DATE        NOT NULL,
  end_date      DATE        NOT NULL,
  reason        TEXT,
  created_by    UUID        REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT no_self_delegation CHECK (delegator_id <> delegate_id),
  CONSTRAINT valid_date_range   CHECK (start_date <= end_date)
);

-- Index for fast "is there an active delegation for this delegate today?" lookups
CREATE INDEX IF NOT EXISTS idx_delegation_delegate_dates
  ON delegation_rules (delegate_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_delegation_delegator
  ON delegation_rules (delegator_id);

-- Enable RLS but grant full access to service role (backend uses service key)
ALTER TABLE delegation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON delegation_rules
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- Vox DPSI — Complete Migration Script
-- Run this ENTIRE script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql/new
-- ============================================================

-- 1. Delegation rules table
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
CREATE INDEX IF NOT EXISTS idx_delegation_delegate_dates ON delegation_rules (delegate_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_delegation_delegator ON delegation_rules (delegator_id);
ALTER TABLE delegation_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON delegation_rules FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 2. Consensus votes + consensus columns on complaints
CREATE TABLE IF NOT EXISTS complaint_votes (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id  UUID        NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  voter_id      UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vote          TEXT        NOT NULL CHECK (vote IN ('approve', 'reject')),
  note          TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE (complaint_id, voter_id)
);
CREATE INDEX IF NOT EXISTS idx_complaint_votes_complaint ON complaint_votes (complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_votes_voter ON complaint_votes (voter_id);
ALTER TABLE complaint_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_votes FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS consensus_required       BOOLEAN     DEFAULT false,
  ADD COLUMN IF NOT EXISTS consensus_status         TEXT        DEFAULT NULL CHECK (consensus_status IN ('voting', 'approved', 'rejected', NULL)),
  ADD COLUMN IF NOT EXISTS consensus_requested_by   UUID        REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS consensus_requested_at   TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS consensus_resolution_note TEXT       DEFAULT NULL;

-- 3. Term limits
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS term_start DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS term_end   DATE DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS term_role  TEXT DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_users_term_end ON users (term_end) WHERE term_end IS NOT NULL AND role IN ('council_member', 'supervisor');

-- 4. Guardian role (update constraint)
DO $$
BEGIN
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
        'student', 'guardian', 'council_member', 'class_teacher', 'coordinator',
        'principal', 'supervisor', 'vice_principal', 'director', 'board_member', 'external_ic_member'
    ));
END $$;

-- 5. Erasure requests + CSAT feedback
CREATE TABLE IF NOT EXISTS erasure_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,
  reason        TEXT NOT NULL,
  status        TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
  reviewer_id   UUID REFERENCES users(id),
  reviewer_note TEXT,
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_user_id ON erasure_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_erasure_requests_status ON erasure_requests(status);
ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON erasure_requests FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TABLE IF NOT EXISTS complaint_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (complaint_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_complaint_feedback_complaint_id ON complaint_feedback(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_feedback_student_id ON complaint_feedback(student_id);
ALTER TABLE complaint_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_feedback FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS feedback_rating SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_note   TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at     TIMESTAMPTZ;

-- 6. System config
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);
INSERT INTO system_config (key, value) VALUES ('round_robin_index', '0') ON CONFLICT (key) DO NOTHING;

-- 7. Fix status CHECK constraint
ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN (
  'raised','verified','in_progress',
  'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
  'resolved','closed','merged','withdrawn','archived','appealed','requires_ic','draft'
));

-- 8. Notifications table (was missing from schema)
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT DEFAULT 'status_change',
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  is_read      BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 9. Complaint access log
CREATE TABLE IF NOT EXISTS complaint_access_log (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id        UUID REFERENCES complaints(id) ON DELETE CASCADE,
  accessed_by         UUID REFERENCES users(id) ON DELETE SET NULL,
  accessed_by_role    TEXT,
  is_assigned_handler BOOLEAN DEFAULT false,
  created_at          TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE complaint_access_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_access_log FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 10. Internal notes
CREATE TABLE IF NOT EXISTS internal_notes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  author_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  note         TEXT NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON internal_notes FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 11. Appeals
CREATE TABLE IF NOT EXISTS appeals (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id          UUID REFERENCES complaints(id) ON DELETE CASCADE,
  filed_by              UUID REFERENCES users(id) ON DELETE SET NULL,
  reason                TEXT NOT NULL,
  status                TEXT DEFAULT 'pending' CHECK (status IN ('pending','voting','upheld','rejected')),
  council_vote          TEXT CHECK (council_vote IN ('uphold','reject',NULL)),
  council_vote_note     TEXT,
  council_voter_id      UUID REFERENCES users(id),
  supervisor_vote       TEXT CHECK (supervisor_vote IN ('uphold','reject',NULL)),
  supervisor_vote_note  TEXT,
  supervisor_voter_id   UUID REFERENCES users(id),
  supervisor_voter_label TEXT,
  resolved_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON appeals FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 12. Complaint deletions
CREATE TABLE IF NOT EXISTS complaint_deletions (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id     UUID REFERENCES complaints(id) ON DELETE CASCADE,
  requested_by     UUID REFERENCES users(id),
  reason           TEXT NOT NULL,
  council_approved BOOLEAN DEFAULT false,
  superior_approved BOOLEAN DEFAULT false,
  superior_id      UUID REFERENCES users(id),
  superior_note    TEXT,
  status           TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  resolved_at      TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE complaint_deletions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON complaint_deletions FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 13. Safe dialogues
CREATE TABLE IF NOT EXISTS safe_dialogues (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message         TEXT NOT NULL,
  is_anonymous    BOOLEAN DEFAULT false,
  student_id      UUID REFERENCES users(id) ON DELETE SET NULL,
  status          TEXT DEFAULT 'open' CHECK (status IN ('open','replied','closed')),
  counselor_reply TEXT,
  replied_by      UUID REFERENCES users(id),
  replied_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE safe_dialogues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON safe_dialogues FOR ALL TO service_role USING (true) WITH CHECK (true);

-- 14. Fix skills assignment (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS domain_expertise TEXT[];
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS guardian_student_id UUID REFERENCES users(id);

-- 15. Fix erasure_requests RLS (auth.uid() doesn't work with custom JWT)
DROP POLICY IF EXISTS "Users can see own erasure requests" ON erasure_requests;
DROP POLICY IF EXISTS "Users can insert own erasure requests" ON erasure_requests;

NOTIFY pgrst, 'reload schema';

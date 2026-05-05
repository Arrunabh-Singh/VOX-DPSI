-- ============================================================
-- Vox DPSI — Migration: Erasure Requests + CSAT Feedback
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
-- ============================================================

-- ── erasure_requests table (#60) ─────────────────────────────────────────────
-- Stores formal data erasure requests submitted by students/parents
-- under DPDP Act 2023 Section 13.

CREATE TABLE IF NOT EXISTS erasure_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role          TEXT NOT NULL,                    -- role at time of request
  reason        TEXT NOT NULL,                    -- user-provided reason (min 20 chars)
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','approved','rejected','completed')),
  reviewer_id   UUID REFERENCES users(id),        -- coordinator/principal who reviewed
  reviewer_note TEXT,                             -- optional note from reviewer
  reviewed_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for fast lookups per user
CREATE INDEX IF NOT EXISTS idx_erasure_requests_user_id
  ON erasure_requests(user_id);

-- Index for coordinator dashboard view (pending requests)
CREATE INDEX IF NOT EXISTS idx_erasure_requests_status
  ON erasure_requests(status);

-- RLS: users can read their own requests; coordinators/principals can read all
ALTER TABLE erasure_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can see own erasure requests" ON erasure_requests;
CREATE POLICY "Users can see own erasure requests"
  ON erasure_requests FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own erasure requests" ON erasure_requests;
CREATE POLICY "Users can insert own erasure requests"
  ON erasure_requests FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- (Service role used by backend bypasses RLS — coordinators use API, not direct DB)


-- ── complaint_feedback table (#10 CSAT) ──────────────────────────────────────
-- One rating per complaint per student. Stored separately for analytics.

CREATE TABLE IF NOT EXISTS complaint_feedback (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  student_id   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment      TEXT,
  created_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE (complaint_id, student_id)              -- one rating per student per complaint
);

-- Index for analytics queries (average rating per handler)
CREATE INDEX IF NOT EXISTS idx_complaint_feedback_complaint_id
  ON complaint_feedback(complaint_id);

CREATE INDEX IF NOT EXISTS idx_complaint_feedback_student_id
  ON complaint_feedback(student_id);

-- RLS: students can read/write their own; supervisors/coordinators/principals can read all
ALTER TABLE complaint_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Students can manage own feedback" ON complaint_feedback;
CREATE POLICY "Students can manage own feedback"
  ON complaint_feedback FOR ALL
  USING (student_id = auth.uid());

-- Also add feedback columns directly on complaints table for fast access
-- (denormalised for single-row reads in ComplaintDetail)
ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS feedback_rating SMALLINT CHECK (feedback_rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS feedback_note   TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at     TIMESTAMPTZ;


-- ── Reload PostgREST schema cache ────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';

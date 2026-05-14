-- ============================================================
-- Vox DPSI — Supabase PostgreSQL Schema
-- Run this in your Supabase SQL editor
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
    'student','council_member','class_teacher','coordinator','principal','supervisor','vice_principal'
  )),
  scholar_no    TEXT,
  section       TEXT,
  house         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── COMPLAINTS ────────────────────────────────────────────────────────────────
CREATE SEQUENCE IF NOT EXISTS complaints_complaint_no_seq START 1;

CREATE TABLE IF NOT EXISTS complaints (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_no                INTEGER DEFAULT nextval('complaints_complaint_no_seq') UNIQUE NOT NULL,
  student_id                  UUID REFERENCES users(id) ON DELETE SET NULL,
  domain                      TEXT NOT NULL CHECK (domain IN (
    'academics','infrastructure','safety','personal','behaviour','other'
  )),
  description                 TEXT NOT NULL,
  is_anonymous_requested      BOOLEAN DEFAULT false,
  identity_revealed           BOOLEAN DEFAULT false,
  attachment_url              TEXT,
  status                      TEXT DEFAULT 'raised' CHECK (status IN (
    'raised','verified','in_progress',
    'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
    'resolved','closed'
  )),
  assigned_council_member_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  supervisor_id               UUID REFERENCES users(id) ON DELETE SET NULL,
  current_handler_role        TEXT DEFAULT 'council_member',
  created_at                  TIMESTAMPTZ DEFAULT now(),
  updated_at                  TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS complaints_updated_at ON complaints;
CREATE TRIGGER complaints_updated_at
  BEFORE UPDATE ON complaints
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ── COMPLAINT TIMELINE ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS complaint_timeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID REFERENCES complaints(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ESCALATIONS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value)
VALUES ('round_robin_index', '0')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS escalations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID REFERENCES complaints(id) ON DELETE CASCADE,
  escalated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_to_role TEXT NOT NULL,
  student_consent   BOOLEAN DEFAULT false,
  reason            TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ROW LEVEL SECURITY (optional — service key bypasses this) ─────────────────
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE complaint_timeline ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE escalations ENABLE ROW LEVEL SECURITY;

-- ── STORAGE BUCKET ────────────────────────────────────────────────────────────
-- Run in Supabase dashboard → Storage → Create bucket named "attachments" (public)

-- Suggestions table (Suggestion Box feature)
CREATE TABLE IF NOT EXISTS suggestions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submitted_by UUID REFERENCES users(id),
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  category     TEXT DEFAULT 'general' CHECK (category IN ('general', 'ui', 'feature', 'bug', 'other')),
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'under_review', 'implemented', 'dismissed')),
  reviewer_note TEXT,
  reviewed_by  UUID REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT now()
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_complaints_student_id ON complaints(student_id);
CREATE INDEX IF NOT EXISTS idx_complaints_council_member_id ON complaints(assigned_council_member_id);
CREATE INDEX IF NOT EXISTS idx_complaints_current_handler_role ON complaints(current_handler_role);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at DESC);

-- Notifications table (missing from original schema)
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  body        TEXT,
  type        TEXT DEFAULT 'status_change',
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  is_read     BOOLEAN DEFAULT false,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_complaint_timeline_complaint_id ON complaint_timeline(complaint_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_submitted_by ON suggestions(submitted_by);

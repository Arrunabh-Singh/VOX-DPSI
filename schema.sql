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

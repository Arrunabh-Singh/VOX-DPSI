-- ============================================================
-- Vox DPSI — Full Setup (Schema + Seed)
-- Paste this entire block into Supabase SQL editor and Run
-- ============================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── DROP EXISTING TABLES (order matters — children first) ─────────────────────
DROP TABLE IF EXISTS escalations       CASCADE;
DROP TABLE IF EXISTS complaint_timeline CASCADE;
DROP TABLE IF EXISTS complaints        CASCADE;
DROP TABLE IF EXISTS system_config     CASCADE;
DROP TABLE IF EXISTS users             CASCADE;
DROP SEQUENCE IF EXISTS complaints_complaint_no_seq;

-- ── USERS ─────────────────────────────────────────────────────────────────────
CREATE TABLE users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  email         TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL CHECK (role IN (
    'student','council_member','class_teacher','coordinator','principal','supervisor'
  )),
  scholar_no    TEXT,
  section       TEXT,
  house         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- ── COMPLAINTS ────────────────────────────────────────────────────────────────
CREATE SEQUENCE complaints_complaint_no_seq START 1;

CREATE TABLE complaints (
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
CREATE TABLE complaint_timeline (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID REFERENCES complaints(id) ON DELETE CASCADE,
  action            TEXT NOT NULL,
  performed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  performed_by_role TEXT,
  note              TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── ESCALATIONS ───────────────────────────────────────────────────────────────
CREATE TABLE system_config (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO system_config (key, value)
VALUES ('round_robin_index', '0');

CREATE TABLE escalations (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id      UUID REFERENCES complaints(id) ON DELETE CASCADE,
  escalated_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  escalated_to_role TEXT NOT NULL,
  student_consent   BOOLEAN DEFAULT false,
  reason            TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- SEED DATA
-- ============================================================

INSERT INTO users (id, name, email, password_hash, role, scholar_no, section, house) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Rahul Sharma',         '5001@student.dpsindore.org',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'student',        '5001', 'XII B', 'Prithvi'),
  ('22222222-2222-2222-2222-222222222222', 'Priya Verma',          '5002@student.dpsindore.org',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'council_member', '5002', 'XII A', 'Agni'),
  ('33333333-3333-3333-3333-333333333333', 'Mrs. Sharma',          'sharma@staff.dpsindore.org',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'class_teacher',  NULL,   'XII B', NULL),
  ('44444444-4444-4444-4444-444444444444', 'Mr. Kapil Sir',        'kapil@staff.dpsindore.org',   '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'coordinator',    NULL,   NULL,   NULL),
  ('55555555-5555-5555-5555-555555555555', 'Mr. Parminder Chopra', 'principal@dpsindore.org',     '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'principal',      NULL,   NULL,   NULL),
  ('66666666-6666-6666-6666-666666666666', 'Arrunabh Singh',       '5411@student.dpsindore.org',  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'supervisor',     '5411', 'XII B', 'Prithvi'),
  ('77777777-7777-7777-7777-777777777777', 'Aisha Khan',           'aisha@student.dpsindore.org', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'student',        '5003', 'XII A', 'Agni');

INSERT INTO complaints (id, complaint_no, student_id, domain, description, is_anonymous_requested, identity_revealed, status, assigned_council_member_id, current_handler_role) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 1, '11111111-1111-1111-1111-111111111111', 'infrastructure', 'The water cooler on the 2nd floor near the science labs has been broken for over two weeks. Students have to walk all the way to the ground floor to get water, which wastes a lot of time during breaks. This is especially inconvenient during summer. The cooler has a visible crack and does not dispense cold water.', false, false, 'in_progress',            '22222222-2222-2222-2222-222222222222', 'council_member'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 2, '77777777-7777-7777-7777-777777777777', 'academics',      'The new mathematics teacher has been covering topics too quickly without checking for understanding. Many students in XII A are struggling with integration and have not been given adequate practice time. We have requested extra doubt sessions multiple times but no action has been taken. At least 15 students in our class are at risk of falling behind before the board exam.',      true,  false, 'escalated_to_coordinator', '22222222-2222-2222-2222-222222222222', 'coordinator'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 3, '11111111-1111-1111-1111-111111111111', 'safety',         'There is a broken tile near the entrance of the basketball court that has already caused two students to trip and fall. One student suffered a minor ankle sprain. The area has not been cordoned off or marked as a hazard. This is a safety risk and requires immediate repair or at least a warning sign to prevent further injuries.',                                                      false, false, 'resolved',                '22222222-2222-2222-2222-222222222222', 'council_member'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 4, '77777777-7777-7777-7777-777777777777', 'behaviour',      'A group of senior students have been consistently occupying the junior common room during lunch breaks and refusing to leave despite requests from junior students and a class prefect. This has been happening for the past 3 weeks. The behavior is intimidating and the juniors feel they cannot access the designated space.',                                                              true,  false, 'escalated_to_teacher',    '22222222-2222-2222-2222-222222222222', 'class_teacher');

INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: infrastructure.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Met with Rahul and confirmed the cooler issue.'),
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Status updated to: in progress','22222222-2222-2222-2222-222222222222', 'council_member', 'Contacted maintenance. Repair scheduled for Friday.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Complaint raised',              '77777777-7777-7777-7777-777777777777', 'student',        'Domain: academics. Anonymity requested.'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Spoke to student (identity kept anonymous).'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Escalated to coordinator',      '22222222-2222-2222-2222-222222222222', 'council_member', 'Issue affects multiple students. Student identity kept anonymous for next handler.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: safety.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Visited the basketball court and confirmed broken tile.'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Complaint resolved',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Maintenance team repaired the tile. Issue fully resolved.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Complaint raised',              '77777777-7777-7777-7777-777777777777', 'student',        'Domain: behaviour. Anonymity requested.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed issue. Identity kept anonymous.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Escalated to class teacher',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Requires teacher intervention. Student identity kept anonymous per their request.');

INSERT INTO escalations (complaint_id, escalated_by, escalated_to_role, student_consent, reason) VALUES
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'coordinator',  false, 'Issue affects multiple students in the class.'),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '22222222-2222-2222-2222-222222222222', 'class_teacher', false, 'Requires teacher authority to address senior student behaviour.');

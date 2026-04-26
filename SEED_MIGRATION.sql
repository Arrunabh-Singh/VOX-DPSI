-- =============================================================
-- VOX DPSI — FINAL DATABASE MIGRATION + SEED
-- Run this in Supabase SQL Editor (Project > SQL Editor > New Query)
-- Safe to run on existing schema — uses IF NOT EXISTS / DO blocks
-- =============================================================

-- ─── 1. Add new columns to complaints ──────────────────────────

ALTER TABLE complaints
  ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal','urgent')),
  ADD COLUMN IF NOT EXISTS sla_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  ADD COLUMN IF NOT EXISTS feedback_note TEXT,
  ADD COLUMN IF NOT EXISTS feedback_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_auto_escalated BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS identity_revealed BOOLEAN DEFAULT false;

-- ─── 2. Add phone column to users ───────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT;

-- ─── 3. Create appeals table ────────────────────────────────────

CREATE TABLE IF NOT EXISTS appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  filed_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'upheld', 'rejected')),
  reviewer_id UUID REFERENCES users(id),
  reviewer_note TEXT,
  review_note TEXT,
  reviewed_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── 4. Create notifications table ──────────────────────────────

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT DEFAULT 'status_update',
  complaint_id UUID REFERENCES complaints(id) ON DELETE SET NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);

-- ─── 5. Create internal_notes table ─────────────────────────────

CREATE TABLE IF NOT EXISTS internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  author_id UUID REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_internal_notes_complaint ON internal_notes(complaint_id);

-- ─── 6. Create complaint_deletions table (dual-approval) ────────

CREATE TABLE IF NOT EXISTS complaint_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID REFERENCES complaints(id) ON DELETE CASCADE,
  requested_by UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  council_approved BOOLEAN DEFAULT true,       -- auto-true (requester is council)
  superior_approved BOOLEAN DEFAULT false,
  superior_id UUID REFERENCES users(id),
  superior_note TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ─── 7. RLS policies (enable if not already enabled) ────────────

-- Enable RLS on new tables
ALTER TABLE appeals ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_deletions ENABLE ROW LEVEL SECURITY;

-- Service role bypasses RLS (backend uses service role key — no policies needed)
-- If you're using anon key from frontend directly, add policies here.
-- This app uses the service role key on the backend, so RLS is permissive:

CREATE POLICY IF NOT EXISTS "service role bypass appeals" ON appeals USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service role bypass notifications" ON notifications USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service role bypass internal_notes" ON internal_notes USING (true) WITH CHECK (true);
CREATE POLICY IF NOT EXISTS "service role bypass deletions" ON complaint_deletions USING (true) WITH CHECK (true);

-- ─── 8. Update STATUSES — ensure 'appealed' status is valid ─────

-- The status check constraint on complaints may need updating:
-- Run this only if you get a check constraint error when setting status='appealed'

DO $$
BEGIN
  ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
  ALTER TABLE complaints ADD CONSTRAINT complaints_status_check
    CHECK (status IN (
      'raised','verified','in_progress',
      'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
      'resolved','appealed','closed'
    ));
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Could not update status constraint: %', SQLERRM;
END;
$$;

-- ─── 9. Demo Users (idempotent — skip if email already exists) ───

DO $$
BEGIN
  -- Student: Rahul Sharma
  INSERT INTO users (name, email, password_hash, role, scholar_no, section, house)
  VALUES ('Rahul Sharma', '5001@student.dpsindore.org',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW', -- "demo123" bcrypt hash
    'student', '5001', 'XII B', 'Prithvi')
  ON CONFLICT (email) DO NOTHING;

  -- Council Member: Priya Verma
  INSERT INTO users (name, email, password_hash, role, section, house)
  VALUES ('Priya Verma', '5002@student.dpsindore.org',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW',
    'council_member', 'XII A', 'Agni')
  ON CONFLICT (email) DO NOTHING;

  -- Class Teacher
  INSERT INTO users (name, email, password_hash, role)
  VALUES ('Mrs. Sharma', 'teacher@dpsi.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW',
    'class_teacher')
  ON CONFLICT (email) DO NOTHING;

  -- Coordinator
  INSERT INTO users (name, email, password_hash, role)
  VALUES ('Mr. Kapil', 'coordinator@dpsi.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW',
    'coordinator')
  ON CONFLICT (email) DO NOTHING;

  -- Principal
  INSERT INTO users (name, email, password_hash, role)
  VALUES ('Mr. Parminder Chopra', 'principal@dpsi.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW',
    'principal')
  ON CONFLICT (email) DO NOTHING;

  -- Supervisor: Arrunabh Singh
  INSERT INTO users (name, email, password_hash, role, section, house)
  VALUES ('Arrunabh Singh', 'supervisor@dpsi.com',
    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uZutAnmZW',
    'supervisor', 'XII B', 'Prithvi')
  ON CONFLICT (email) DO NOTHING;
END;
$$;

-- ─── 10. Sample complaints (requires user IDs — run after users exist) ─

-- Get user IDs and create sample complaints
DO $$
DECLARE
  student_id    UUID;
  council_id    UUID;
  teacher_id    UUID;
  coord_id      UUID;
  principal_id  UUID;
  c1 UUID; c2 UUID; c3 UUID; c4 UUID;
BEGIN
  SELECT id INTO student_id   FROM users WHERE email = '5001@student.dpsindore.org';
  SELECT id INTO council_id   FROM users WHERE email = '5002@student.dpsindore.org';
  SELECT id INTO teacher_id   FROM users WHERE email = 'teacher@dpsi.com';
  SELECT id INTO coord_id     FROM users WHERE email = 'coordinator@dpsi.com';
  SELECT id INTO principal_id FROM users WHERE email = 'principal@dpsi.com';

  IF student_id IS NULL OR council_id IS NULL THEN
    RAISE NOTICE 'Demo users not found — skipping sample complaints. Create users first.';
    RETURN;
  END IF;

  -- Complaint 1: Resolved infrastructure complaint (with feedback)
  INSERT INTO complaints (student_id, domain, description, priority, status, current_handler_role,
    assigned_council_member_id, is_anonymous_requested, feedback_rating, feedback_note, feedback_at,
    identity_revealed, created_at, updated_at)
  VALUES (student_id, 'infrastructure',
    'The water cooler in the XII B corridor has been broken for over a week. Students have no access to drinking water during breaks, which is especially problematic given the current heat. The cooler makes a loud noise and does not dispense water at all.',
    'urgent', 'resolved', 'council_member', council_id, false,
    5, 'Issue was fixed very quickly! Thank you.', now() - interval '1 day',
    false, now() - interval '5 days', now() - interval '1 day')
  RETURNING id INTO c1;

  INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note)
  VALUES
    (c1, 'Complaint raised', student_id, 'student', 'Domain: infrastructure. Priority: urgent.'),
    (c1, 'Verified in person', council_id, 'council_member', 'Visited XII B corridor, confirmed cooler is broken.'),
    (c1, 'Status updated to: in progress', council_id, 'council_member', 'Reported to school maintenance team.'),
    (c1, 'Complaint resolved', council_id, 'council_member', 'Water cooler repaired by maintenance on same day.');

  -- Complaint 2: Anonymous, escalated to teacher
  INSERT INTO complaints (student_id, domain, description, priority, status, current_handler_role,
    assigned_council_member_id, is_anonymous_requested, identity_revealed, created_at, updated_at)
  VALUES (student_id, 'behaviour',
    'A group of senior students in the corridor have been using inappropriate language and intimidating younger students near the library during lunch break. This has been happening for the past two weeks and multiple students are scared to use the library.',
    'urgent', 'escalated_to_teacher', 'class_teacher', council_id, true, false,
    now() - interval '3 days', now() - interval '1 day')
  RETURNING id INTO c2;

  INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note)
  VALUES
    (c2, 'Complaint raised', student_id, 'student', 'Domain: behaviour. Priority: urgent. Anonymity requested.'),
    (c2, '⚡ Auto-flagged Urgent — sensitive keyword detected', student_id, 'system', 'Keyword detected: "scared". Complaint auto-upgraded to URGENT.'),
    (c2, 'Verified in person', council_id, 'council_member', 'Met with student privately. Situation confirmed serious.'),
    (c2, 'Escalated to class teacher', council_id, 'council_member', 'Behaviour issue requires teacher intervention. Student identity kept anonymous per their request.');

  INSERT INTO escalations (complaint_id, escalated_by, escalated_to_role, student_consent, reason)
  VALUES (c2, council_id, 'class_teacher', false, 'Behaviour issue beyond council scope. Anonymity preserved.');

  -- Complaint 3: In progress at coordinator level
  INSERT INTO complaints (student_id, domain, description, priority, status, current_handler_role,
    assigned_council_member_id, is_anonymous_requested, identity_revealed, created_at, updated_at)
  VALUES (student_id, 'academics',
    'The biology teacher has not covered the chapters scheduled in the academic calendar for the past three weeks. We have board exams in two months and are significantly behind. Multiple students have tried speaking to the teacher but were dismissed. This will directly affect our exam performance.',
    'normal', 'escalated_to_coordinator', 'coordinator', council_id, false, false,
    now() - interval '6 days', now() - interval '2 days')
  RETURNING id INTO c3;

  INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note)
  VALUES
    (c3, 'Complaint raised', student_id, 'student', 'Domain: academics. Priority: normal.'),
    (c3, 'Verified in person', council_id, 'council_member', 'Spoke to class representative. Issue confirmed.'),
    (c3, 'Escalated to class teacher', council_id, 'council_member', 'Teacher awareness needed.'),
    (c3, 'Escalated to Coordinator', teacher_id, 'class_teacher', 'Ongoing issue needs coordinator intervention.');

  -- Complaint 4: Newly raised, normal priority
  INSERT INTO complaints (student_id, domain, description, priority, status, current_handler_role,
    assigned_council_member_id, is_anonymous_requested, identity_revealed, created_at, updated_at)
  VALUES (student_id, 'personal',
    'I am facing significant stress and anxiety related to upcoming board exams combined with family pressure. I would like to request counseling sessions through the school. The current process requires a parent signature which is not possible in my situation and I need alternative support.',
    'normal', 'raised', 'council_member', council_id, false, false,
    now() - interval '2 hours', now() - interval '2 hours')
  RETURNING id INTO c4;

  INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note)
  VALUES (c4, 'Complaint raised', student_id, 'student', 'Domain: personal. Priority: normal.');

  RAISE NOTICE 'Sample complaints created: %, %, %, %', c1, c2, c3, c4;
END;
$$;

-- ─── 11. Add sample notifications ───────────────────────────────

DO $$
DECLARE
  student_id UUID;
BEGIN
  SELECT id INTO student_id FROM users WHERE email = '5001@student.dpsindore.org';
  IF student_id IS NOT NULL THEN
    INSERT INTO notifications (user_id, title, body, type, is_read)
    VALUES
      (student_id, 'VOX-001 Resolved 🎉', 'Your infrastructure complaint has been resolved. Please rate your experience.', 'resolution', false),
      (student_id, 'VOX-002 Status Update', 'Your complaint has been escalated to your Class Teacher.', 'escalation', true),
      (student_id, 'VOX-003 Status Update', 'Your complaint has been escalated to the Coordinator.', 'escalation', true);
  END IF;
END;
$$;

-- ─── Done ────────────────────────────────────────────────────────
-- All tables and seed data created.
-- Passwords for all demo accounts: demo123
-- Run this script once in Supabase SQL Editor.

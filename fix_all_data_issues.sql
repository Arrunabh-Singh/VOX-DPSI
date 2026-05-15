-- ================================================================
-- VOX DPSI — Comprehensive Data Fix
-- Run at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql
-- Created: 2026-05-15
-- ================================================================
-- All demo passwords: demo123 (hash: $2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe)

-- ————————————————————————————————————————————————————————————————
-- 1. INSERT VICE PRINCIPAL ACCOUNT
-- ————————————————————————————————————————————————————————————————
INSERT INTO users (id, name, email, password_hash, role, vpc_status)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  'Dr. Meena Kapoor',
  'vp@dpsi.com',
  '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe',
  'vice_principal',
  'not_required'
)
ON CONFLICT (id) DO UPDATE
  SET name            = EXCLUDED.name,
      email           = EXCLUDED.email,
      password_hash   = EXCLUDED.password_hash,
      role            = EXCLUDED.role,
      vpc_status      = EXCLUDED.vpc_status;

-- ————————————————————————————————————————————————————————————————
-- 2. ADD 2 MORE COUNCIL MEMBERS (for complaint distribution)
-- ————————————————————————————————————————————————————————————————
INSERT INTO users (id, name, email, password_hash, role, scholar_no, section, house, vpc_status)
VALUES
  ('c2000001-0000-0000-0000-000000000001',
   'Anjali Menon', 'anjali.council@dpsi.com',
   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe',
   'council_member', '5003', 'XII A', 'Vayu', 'not_required'),
  ('c2000002-0000-0000-0000-000000000002',
   'Dev Bhatia', 'dev.council@dpsi.com',
   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe',
   'council_member', '5004', 'XII C', 'Akash', 'not_required')
ON CONFLICT (id) DO NOTHING;

-- ————————————————————————————————————————————————————————————————
-- 3. FIX SUPERVISOR: clear scholar_no/section/house (currently
--    '5411' which is the same as demo student Rahul Sharma)
-- ————————————————————————————————————————————————————————————————
UPDATE users
SET scholar_no = NULL,
    section    = NULL,
    house      = NULL
WHERE id   = '66666666-6666-6666-6666-666666666666'
  AND role = 'supervisor';

-- ————————————————————————————————————————————————————————————————
-- 4. DISTRIBUTE COMPLAINTS ACROSS 3 COUNCIL MEMBERS (round-robin)
--    Order by complaint_no so the distribution is deterministic.
--    Council ordered by name: Anjali Menon → Dev Bhatia → Priya Verma
-- ————————————————————————————————————————————————————————————————
WITH ranked_complaints AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY complaint_no) AS rn
  FROM complaints
),
council_list AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS cn
  FROM users
  WHERE role = 'council_member'
),
total_council AS (
  SELECT COUNT(*) AS cnt FROM council_list
)
UPDATE complaints c
SET assigned_council_member_id = (
  SELECT cl.id
  FROM council_list cl, total_council tc
  WHERE cl.cn = ((rc.rn - 1) % tc.cnt) + 1
)
FROM ranked_complaints rc
WHERE c.id = rc.id;

-- ————————————————————————————————————————————————————————————————
-- 5. REMOVE DUPLICATE ESCALATION ROWS
--    Keep the earliest entry per (complaint_id, escalated_to_role)
-- ————————————————————————————————————————————————————————————————
DELETE FROM escalations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY complaint_id, escalated_to_role
             ORDER BY created_at
           ) AS rn
    FROM escalations
  ) sub
  WHERE rn > 1
);

-- ————————————————————————————————————————————————————————————————
-- 6. FIX NULL escalated_by in escalations
--    Attribute auto-escalations to the council member on the complaint
-- ————————————————————————————————————————————————————————————————
UPDATE escalations e
SET escalated_by = c.assigned_council_member_id
FROM complaints c
WHERE e.complaint_id = c.id
  AND e.escalated_by IS NULL
  AND c.assigned_council_member_id IS NOT NULL;

-- ————————————————————————————————————————————————————————————————
-- 7. ADD 5 MORE DEMO COMPLAINTS (brings total from 26 → 31)
-- ————————————————————————————————————————————————————————————————

-- VOX-0032: raised · infrastructure · Aarav Nair
INSERT INTO complaints (
  student_id, domain, description,
  is_anonymous_requested, identity_revealed, status,
  assigned_council_member_id, current_handler_role,
  created_at, updated_at
) VALUES (
  'b0000001-0000-0000-0000-000000000001',
  'infrastructure',
  'The projector in Room 204 has been non-functional for over a month. Teachers have had to write on the board instead of using digital notes, significantly slowing down the pace of lessons. The issue has been reported informally but no maintenance ticket appears to have been raised.',
  false, false, 'raised',
  'c2000001-0000-0000-0000-000000000001', 'council_member',
  NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'
);

-- VOX-0033: in_progress · safety · Divya Patel
INSERT INTO complaints (
  student_id, domain, description,
  is_anonymous_requested, identity_revealed, status,
  assigned_council_member_id, current_handler_role,
  created_at, updated_at
) VALUES (
  'b0000002-0000-0000-0000-000000000002',
  'safety',
  'The fire exit at the end of the B-wing corridor on the second floor has been blocked with old furniture and supply boxes for the past two months. During a fire drill last Tuesday students could not open the door. This is a critical safety violation that must be rectified immediately.',
  false, false, 'in_progress',
  'c2000002-0000-0000-0000-000000000002', 'council_member',
  NOW() - INTERVAL '8 days', NOW() - INTERVAL '5 days'
);

-- VOX-0034: verified · academics · Siddharth Mishra
INSERT INTO complaints (
  student_id, domain, description,
  is_anonymous_requested, identity_revealed, status,
  assigned_council_member_id, current_handler_role,
  created_at, updated_at
) VALUES (
  'b0000003-0000-0000-0000-000000000003',
  'academics',
  'Our mathematics teacher has not returned test papers from last month''s unit assessment. Without feedback on our mistakes we cannot prepare effectively for the upcoming pre-board exams. Three requests have been made verbally over two weeks with no response.',
  false, false, 'verified',
  '22222222-2222-2222-2222-222222222222', 'council_member',
  NOW() - INTERVAL '12 days', NOW() - INTERVAL '9 days'
);

-- VOX-0035: escalated_to_teacher · behaviour · Tanishka Sahu (anonymous)
INSERT INTO complaints (
  student_id, domain, description,
  is_anonymous_requested, identity_revealed, status,
  assigned_council_member_id, current_handler_role,
  created_at, updated_at
) VALUES (
  'b0000004-0000-0000-0000-000000000004',
  'behaviour',
  'A classmate has been consistently copying homework and submitting it as their own work. When confronted privately the student became aggressive and threatening. The behaviour is affecting group dynamics and class morale. Several students are now reluctant to share notes in group study sessions.',
  true, false, 'escalated_to_teacher',
  'c2000001-0000-0000-0000-000000000001', 'class_teacher',
  NOW() - INTERVAL '15 days', NOW() - INTERVAL '7 days'
);

-- VOX-0036: resolved · personal · Rohan Desai
INSERT INTO complaints (
  student_id, domain, description,
  is_anonymous_requested, identity_revealed, status,
  assigned_council_member_id, current_handler_role,
  created_at, updated_at
) VALUES (
  'b0000005-0000-0000-0000-000000000005',
  'personal',
  'I was incorrectly marked absent for three consecutive days last week despite attending all classes. This has affected my attendance record and my parents received an automated SMS warning. The attendance register appears to have a data entry error that needs immediate correction.',
  false, false, 'resolved',
  'c2000002-0000-0000-0000-000000000002', 'coordinator',
  NOW() - INTERVAL '20 days', NOW() - INTERVAL '14 days'
);

-- ————————————————————————————————————————————————————————————————
-- 8. ADD COMPLAINT TIMELINE ENTRIES for the 5 new complaints
-- ————————————————————————————————————————————————————————————————

-- Timeline: verified complaint (Siddharth's academics)
INSERT INTO complaint_timeline (complaint_id, performed_by, performed_by_role, action, note, created_at)
SELECT c.id,
       '22222222-2222-2222-2222-222222222222',
       'council_member',
       'status_changed',
       'Complaint reviewed and marked as verified. Contacting subject teacher regarding assessment return timeline.',
       NOW() - INTERVAL '9 days'
FROM complaints c
WHERE c.student_id = 'b0000003-0000-0000-0000-000000000003'
  AND c.status = 'verified'
ORDER BY c.created_at DESC
LIMIT 1;

-- Timeline: in_progress safety complaint (Divya's fire exit)
INSERT INTO complaint_timeline (complaint_id, performed_by, performed_by_role, action, note, created_at)
SELECT c.id,
       'c2000002-0000-0000-0000-000000000002',
       'council_member',
       'status_changed',
       'Complaint verified. Maintenance supervisor has been informed. Furniture removal scheduled for Monday.',
       NOW() - INTERVAL '5 days'
FROM complaints c
WHERE c.student_id = 'b0000002-0000-0000-0000-000000000002'
  AND c.status = 'in_progress'
ORDER BY c.created_at DESC
LIMIT 1;

-- Timeline: escalation note (Tanishka's behaviour → teacher)
INSERT INTO complaint_timeline (complaint_id, performed_by, performed_by_role, action, note, created_at)
SELECT c.id,
       'c2000001-0000-0000-0000-000000000001',
       'council_member',
       'escalated',
       'Behaviour complaint escalated to class teacher for direct intervention. Student anonymity preserved as requested.',
       NOW() - INTERVAL '7 days'
FROM complaints c
WHERE c.student_id = 'b0000004-0000-0000-0000-000000000004'
  AND c.status = 'escalated_to_teacher'
ORDER BY c.created_at DESC
LIMIT 1;

-- Timeline: resolution note (Rohan's attendance)
INSERT INTO complaint_timeline (complaint_id, performed_by, performed_by_role, action, note, created_at)
SELECT c.id,
       '44444444-4444-4444-4444-444444444444',
       'coordinator',
       'resolved',
       'Attendance register corrected after verification with class teacher. Student record updated. Parents notified via school messaging system.',
       NOW() - INTERVAL '14 days'
FROM complaints c
WHERE c.student_id = 'b0000005-0000-0000-0000-000000000005'
  AND c.status = 'resolved'
ORDER BY c.created_at DESC
LIMIT 1;

-- ————————————————————————————————————————————————————————————————
-- 9. ADD ESCALATION ENTRY for the new escalated_to_teacher complaint
-- ————————————————————————————————————————————————————————————————
INSERT INTO escalations (complaint_id, escalated_by, escalated_to_role, student_consent, reason, created_at)
SELECT c.id,
       'c2000001-0000-0000-0000-000000000001',
       'class_teacher',
       false,
       'Behaviour issue requires direct class teacher intervention. Student anonymity maintained.',
       NOW() - INTERVAL '7 days'
FROM complaints c
WHERE c.student_id = 'b0000004-0000-0000-0000-000000000004'
  AND c.status = 'escalated_to_teacher'
ORDER BY c.created_at DESC
LIMIT 1;

-- ————————————————————————————————————————————————————————————————
-- 10. ADD NOTIFICATIONS for new council members
-- ————————————————————————————————————————————————————————————————
INSERT INTO notifications (user_id, title, body, link, is_read, created_at)
VALUES
  ('c2000001-0000-0000-0000-000000000001',
   'New complaint assigned',
   'A complaint about classroom projector has been assigned to you.',
   '/complaints', false, NOW() - INTERVAL '3 days'),
  ('c2000001-0000-0000-0000-000000000001',
   'Complaint escalated',
   'A behaviour complaint has been escalated to the class teacher.',
   '/complaints', false, NOW() - INTERVAL '7 days'),
  ('c2000002-0000-0000-0000-000000000002',
   'New complaint assigned',
   'A safety complaint regarding blocked fire exit has been assigned to you.',
   '/complaints', false, NOW() - INTERVAL '8 days'),
  ('c2000002-0000-0000-0000-000000000002',
   'Complaint resolved',
   'The attendance error complaint has been resolved at coordinator level.',
   '/complaints', true, NOW() - INTERVAL '14 days');

-- ————————————————————————————————————————————————————————————————
-- VERIFICATION: Final row counts
-- ————————————————————————————————————————————————————————————————
SELECT 'users'                AS tbl, COUNT(*) AS rows FROM users
UNION ALL
SELECT 'complaints',                  COUNT(*)          FROM complaints
UNION ALL
SELECT 'complaint_timeline',          COUNT(*)          FROM complaint_timeline
UNION ALL
SELECT 'escalations',                 COUNT(*)          FROM escalations
UNION ALL
SELECT 'notifications',               COUNT(*)          FROM notifications
UNION ALL
SELECT 'complaint_votes',             COUNT(*)          FROM complaint_votes
UNION ALL
SELECT 'delegation_rules',            COUNT(*)          FROM delegation_rules
UNION ALL
SELECT 'workflow_templates',          COUNT(*)          FROM workflow_templates
UNION ALL
SELECT 'resolution_templates',        COUNT(*)          FROM resolution_templates
UNION ALL
SELECT 'system_config',               COUNT(*)          FROM system_config;

-- ————————————————————————————————————————————————————————————————
-- SANITY CHECKS
-- ————————————————————————————————————————————————————————————————

-- Check: VP account exists
SELECT id, name, email, role FROM users WHERE role = 'vice_principal';

-- Check: 3 council members now
SELECT id, name, email, role FROM users WHERE role = 'council_member' ORDER BY name;

-- Check: complaints distributed (no single council member has all)
SELECT u.name AS council_member, COUNT(c.id) AS complaint_count
FROM complaints c
JOIN users u ON u.id = c.assigned_council_member_id
GROUP BY u.name
ORDER BY u.name;

-- Check: no duplicate escalations
SELECT complaint_id, escalated_to_role, COUNT(*) AS cnt
FROM escalations
GROUP BY complaint_id, escalated_to_role
HAVING COUNT(*) > 1;

-- Check: supervisor has no scholar_no
SELECT id, name, scholar_no, section, house FROM users WHERE role = 'supervisor';

-- Check: total complaints
SELECT COUNT(*) AS total_complaints FROM complaints;

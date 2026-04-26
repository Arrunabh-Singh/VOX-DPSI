-- ============================================================
-- Vox DPSI — Alpha 0.3 Full Seed
-- Run AFTER schema.sql + SEED_MIGRATION.sql
-- Password for all accounts: demo123
-- ============================================================

-- Clear ALL existing data (safe order due to FK constraints)
DELETE FROM suggestions;
DELETE FROM internal_notes;
DELETE FROM appeals;
DELETE FROM complaint_deletions;
DELETE FROM escalations;
DELETE FROM complaint_timeline;
DELETE FROM notifications;
DELETE FROM complaints;
DELETE FROM users;

ALTER SEQUENCE complaints_complaint_no_seq RESTART WITH 1;

-- ═══════════════════════════════════════════════════════════
-- SECTION 1: DEMO ACCOUNTS (login with these)
-- All passwords: demo123
-- ═══════════════════════════════════════════════════════════
INSERT INTO users (id, name, email, password_hash, role, scholar_no, section, house) VALUES
  -- Demo student (sees exactly 7 complaints)
  ('11111111-1111-1111-1111-111111111111', 'Rahul Sharma',          'student@dpsi.com',       '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student',        '5001', 'XII B', 'Prithvi'),
  -- Demo council member
  ('22222222-2222-2222-2222-222222222222', 'Priya Verma',           'council@dpsi.com',       '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'council_member', '5002', 'XII B', 'Agni'),
  -- Class teacher (XII B matches Rahul's section)
  ('33333333-3333-3333-3333-333333333333', 'Mrs. Sunita Sharma',    'teacher@dpsi.com',       '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'class_teacher',  NULL,   'XII B', NULL),
  -- Coordinator
  ('44444444-4444-4444-4444-444444444444', 'Mr. Kapil Malhotra',    'coordinator@dpsi.com',   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'coordinator',    NULL,   NULL,   NULL),
  -- Principal
  ('55555555-5555-5555-5555-555555555555', 'Mr. Parminder Chopra',  'principal@dpsi.com',     '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'principal',      NULL,   NULL,   NULL),
  -- Supervisor (single shared VOX-O6 account — 6 members select name on login)
  ('66666666-6666-6666-6666-666666666666', 'VOX-O6 Supervisor',     'supervisor@dpsi.com',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'supervisor',     '5411', 'XII B', 'Prithvi'),
  -- Vice principal
  ('77777777-7777-7777-7777-777777777777', 'Dr. Meena Kapoor',      'vp@dpsi.com',            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMlJbekRShjle7V3Bm6EL3ciy6', 'vice_principal',  NULL,   NULL,   NULL);

-- ═══════════════════════════════════════════════════════════
-- SECTION 2: BACKGROUND STUDENTS (no login, for analytics)
-- Spread across all sections & houses
-- ═══════════════════════════════════════════════════════════
INSERT INTO users (id, name, email, password_hash, role, scholar_no, section, house) VALUES
  ('b0000001-0000-0000-0000-000000000001', 'Aarav Nair',          'aarav@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6001', 'XII A', 'Agni'),
  ('b0000002-0000-0000-0000-000000000002', 'Divya Patel',         'divya@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6002', 'XII C', 'Vayu'),
  ('b0000003-0000-0000-0000-000000000003', 'Siddharth Mishra',    'sidd@bg.dpsindore.org',     '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6003', 'XI A', 'Prithvi'),
  ('b0000004-0000-0000-0000-000000000004', 'Tanishka Sahu',       'tanishka@bg.dpsindore.org', '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6004', 'XI B', 'Akash'),
  ('b0000005-0000-0000-0000-000000000005', 'Rohan Desai',         'rohan@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6005', 'XII D', 'Prithvi'),
  ('b0000006-0000-0000-0000-000000000006', 'Meghna Iyer',         'meghna@bg.dpsindore.org',   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6006', 'XII E', 'Agni'),
  ('b0000007-0000-0000-0000-000000000007', 'Kabir Choudhary',     'kabir@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6007', 'XI C', 'Vayu'),
  ('b0000008-0000-0000-0000-000000000008', 'Sneha Rajput',        'sneha@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6008', 'XI D', 'Akash'),
  ('b0000009-0000-0000-0000-000000000009', 'Arjun Tiwari',        'arjun@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6009', 'XII F', 'Prithvi'),
  ('b0000010-0000-0000-0000-000000000010', 'Pooja Yadav',         'pooja@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6010', 'XI E', 'Agni'),
  ('b0000011-0000-0000-0000-000000000011', 'Nikhil Bhatt',        'nikhil@bg.dpsindore.org',   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6011', 'XII G', 'Vayu'),
  ('b0000012-0000-0000-0000-000000000012', 'Aisha Khan',          'aisha@bg.dpsindore.org',    '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6012', 'XI F', 'Akash'),
  ('b0000013-0000-0000-0000-000000000013', 'Pranav Khanna',       'pranav@bg.dpsindore.org',   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6013', 'XI G', 'Prithvi'),
  ('b0000014-0000-0000-0000-000000000014', 'Ritu Saxena',         'ritu@bg.dpsindore.org',     '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6014', 'XII A', 'Agni'),
  ('b0000015-0000-0000-0000-000000000015', 'Vishal Bose',         'vishal@bg.dpsindore.org',   '$2a$12$X0tpanbG.FRokosj6hhb4u.Fglm.4y5zUjpvlYeKF03TrVyi11SGe', 'student', '6015', 'XII B', 'Vayu');

-- ═══════════════════════════════════════════════════════════
-- SECTION 3: DEMO COMPLAINTS (Rahul — exactly 7)
-- ═══════════════════════════════════════════════════════════
INSERT INTO complaints (id, complaint_no, student_id, domain, description, is_anonymous_requested, identity_revealed, status, assigned_council_member_id, current_handler_role, created_at, updated_at) VALUES
  -- VOX-001 · In Progress · Infrastructure
  ('d0000001-0000-0000-0000-000000000001', 1,
   '11111111-1111-1111-1111-111111111111', 'infrastructure',
   'The water cooler on the 2nd floor near the science labs has been broken for over two weeks. Students have to walk to the ground floor for water, which wastes time during breaks. The cooler has a visible crack and does not dispense cold water. Repeated verbal complaints to staff have yielded no response.',
   false, false, 'in_progress',
   '22222222-2222-2222-2222-222222222222', 'council_member',
   NOW() - INTERVAL '14 days', NOW() - INTERVAL '10 days'),

  -- VOX-002 · Resolved · Safety
  ('d0000002-0000-0000-0000-000000000002', 2,
   '11111111-1111-1111-1111-111111111111', 'safety',
   'There is a broken floor tile near the basketball court entrance that has already caused two students to trip and fall. One student suffered a minor ankle sprain. The area has no warning signs or barricade. This is an urgent safety hazard requiring immediate repair or at minimum a physical barrier.',
   false, false, 'resolved',
   '22222222-2222-2222-2222-222222222222', 'council_member',
   NOW() - INTERVAL '30 days', NOW() - INTERVAL '22 days'),

  -- VOX-003 · Escalated to Coordinator · Academics · Anonymous
  ('d0000003-0000-0000-0000-000000000003', 3,
   '11111111-1111-1111-1111-111111111111', 'academics',
   'The substitute teacher covering chemistry for the last 3 weeks has not followed the syllabus. Important chapters on electrochemistry and organic reactions have been skipped entirely. Board exams are in 6 weeks and students are panicking. Multiple students have raised this privately but the issue has not been addressed.',
   true, false, 'escalated_to_coordinator',
   '22222222-2222-2222-2222-222222222222', 'coordinator',
   NOW() - INTERVAL '20 days', NOW() - INTERVAL '12 days'),

  -- VOX-004 · Escalated to Teacher · Behaviour · Anonymous
  ('d0000004-0000-0000-0000-000000000004', 4,
   '11111111-1111-1111-1111-111111111111', 'behaviour',
   'A group of senior students have been consistently occupying the junior common room during lunch and refusing to leave despite polite requests. The behaviour is intimidating. This has happened daily for 3 weeks. Juniors feel they cannot access their designated space and are eating in classrooms instead.',
   true, false, 'escalated_to_teacher',
   '22222222-2222-2222-2222-222222222222', 'class_teacher',
   NOW() - INTERVAL '18 days', NOW() - INTERVAL '11 days'),

  -- VOX-005 · Raised · Personal · Anonymous
  ('d0000005-0000-0000-0000-000000000005', 5,
   '11111111-1111-1111-1111-111111111111', 'personal',
   'I have been experiencing consistent academic pressure from a particular staff member who has been making public remarks about my grades in front of the class. This has affected my confidence and I find it difficult to participate in class. I request this be handled with strict confidentiality.',
   true, false, 'raised',
   '22222222-2222-2222-2222-222222222222', 'council_member',
   NOW() - INTERVAL '4 days', NOW() - INTERVAL '4 days'),

  -- VOX-006 · Appealed (resolved then appealed) · Infrastructure
  ('d0000006-0000-0000-0000-000000000006', 6,
   '11111111-1111-1111-1111-111111111111', 'infrastructure',
   'The WiFi in the school library is consistently dropping and shows speeds under 1 Mbps during peak hours (10am-12pm and 2pm-4pm). Students using it for research or accessing e-learning portals during free periods cannot work effectively. The issue has persisted for over a month.',
   false, false, 'appealed',
   '22222222-2222-2222-2222-222222222222', 'council_member',
   NOW() - INTERVAL '25 days', NOW() - INTERVAL '5 days'),

  -- VOX-007 · In Progress · Other
  ('d0000007-0000-0000-0000-000000000007', 7,
   '11111111-1111-1111-1111-111111111111', 'other',
   'The school canteen has been regularly running out of food items by 12:30 PM, leaving students in later lunch batches (12:45 PM onwards) with very limited options. This has been happening for the past 2 weeks since the schedule changed. Students from XII B are on the last lunch batch and often go without a proper meal.',
   false, false, 'verified',
   '22222222-2222-2222-2222-222222222222', 'council_member',
   NOW() - INTERVAL '8 days', NOW() - INTERVAL '6 days');

-- ═══════════════════════════════════════════════════════════
-- SECTION 4: BACKGROUND COMPLAINTS (for rich analytics)
-- Assigned to Priya — boosting her score to ~82
-- ═══════════════════════════════════════════════════════════
INSERT INTO complaints (id, complaint_no, student_id, domain, description, is_anonymous_requested, identity_revealed, status, assigned_council_member_id, current_handler_role, created_at, updated_at) VALUES
  -- Resolved by Priya — 10 of these for score
  ('b1000001-0000-0000-0000-000000000001', 8,  'b0000001-0000-0000-0000-000000000001', 'academics',       'Several students in XII A report that the new physics teacher covers derivations too fast. Requests for repetition are ignored. Doubt sessions promised twice were cancelled without notice.',                                                              false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '58 days', NOW()-INTERVAL '40 days'),
  ('b1000002-0000-0000-0000-000000000002', 9,  'b0000002-0000-0000-0000-000000000002', 'infrastructure',  'The girls washroom on 3rd floor has no running water since Monday. Students are using washrooms on other floors during class, causing disruption.',                                                                                                     false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '55 days', NOW()-INTERVAL '38 days'),
  ('b1000003-0000-0000-0000-000000000003', 10, 'b0000003-0000-0000-0000-000000000003', 'safety',          'Staircase railing near the auditorium is completely loose. A student nearly fell last Friday. Maintenance has been informed twice but no action. This is an urgent hazard.',                                                                          false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '52 days', NOW()-INTERVAL '36 days'),
  ('b1000004-0000-0000-0000-000000000004', 11, 'b0000004-0000-0000-0000-000000000004', 'behaviour',       'A student in XI B has been consistently bullying three juniors in the corridor between 8:30-8:45 AM, taking their belongings and making derogatory comments. Witnesses are afraid to report.',                                                         true,  false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '50 days', NOW()-INTERVAL '34 days'),
  ('b1000005-0000-0000-0000-000000000005', 12, 'b0000005-0000-0000-0000-000000000005', 'academics',       'The computer science lab has only 20 working systems for 35 students. Students are sharing computers during practicals, reducing hands-on time significantly. The issue has persisted since the start of this term.',                                  false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '47 days', NOW()-INTERVAL '30 days'),
  ('b1000006-0000-0000-0000-000000000006', 13, 'b0000006-0000-0000-0000-000000000006', 'infrastructure',  'The AC in XII E has not been working for 3 weeks. With temperatures crossing 38°C, students are finding it impossible to concentrate. Multiple requests submitted but no timeline for repair has been given.',                                         false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '44 days', NOW()-INTERVAL '28 days'),
  ('b1000007-0000-0000-0000-000000000007', 14, 'b0000007-0000-0000-0000-000000000007', 'safety',          'The fire extinguisher in the XI C corridor has an expired inspection tag. In the event of a fire, it may not function. This should be replaced or recertified immediately per safety regulations.',                                                    false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '42 days', NOW()-INTERVAL '26 days'),
  ('b1000008-0000-0000-0000-000000000008', 15, 'b0000008-0000-0000-0000-000000000008', 'other',           'The school bus route has been changed without notice. Several students from Scheme 54 are now walking an additional 1.2 km to the new pickup point. Parents were not informed. A revised schedule and communication is urgently needed.',              false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '40 days', NOW()-INTERVAL '24 days'),
  ('b1000009-0000-0000-0000-000000000009', 16, 'b0000009-0000-0000-0000-000000000009', 'personal',        'A student in XII F is facing consistent public humiliation from a particular teacher who singles them out during exams and makes comparisons to other students loudly. The student has been avoiding that class.',                                       true,  false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '38 days', NOW()-INTERVAL '22 days'),
  ('b1000010-0000-0000-0000-000000000010', 17, 'b0000010-0000-0000-0000-000000000010', 'academics',       'The economics tutor for XI has been absent 7 out of the last 12 class days. No substitute has been arranged. Students are falling behind and the school has not communicated any plan for catching up.',                                              false, false, 'resolved', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '36 days', NOW()-INTERVAL '20 days'),
  -- In Progress (assigned to Priya, not yet resolved)
  ('b1000011-0000-0000-0000-000000000011', 18, 'b0000011-0000-0000-0000-000000000011', 'infrastructure',  'Benches in XII G classroom are broken and wobbly. Three students have complained of back pain. At least 6 benches need urgent replacement before the term exams.',                                                                                     false, false, 'in_progress', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '10 days', NOW()-INTERVAL '7 days'),
  ('b1000012-0000-0000-0000-000000000012', 19, 'b0000012-0000-0000-0000-000000000012', 'behaviour',       'Online harassment through an anonymous social media account targeting students from XI F. Screenshots have been taken. The account shares personal information about students. Privacy and dignity at stake.',                                           true,  false, 'in_progress', '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '7 days',  NOW()-INTERVAL '5 days'),
  -- Escalated
  ('b1000013-0000-0000-0000-000000000013', 20, 'b0000013-0000-0000-0000-000000000013', 'safety',          'CCTV cameras near the library have been non-functional for over a month. Given recent incidents of theft, the absence of surveillance poses a security risk. Administration has been verbally informed but no action.',                               false, false, 'escalated_to_coordinator', '22222222-2222-2222-2222-222222222222', 'coordinator', NOW()-INTERVAL '22 days', NOW()-INTERVAL '14 days'),
  ('b1000014-0000-0000-0000-000000000014', 21, 'b0000014-0000-0000-0000-000000000014', 'academics',       'Multiple students in XII A report that unit test papers from March have not been returned. The concerned teacher has given different answers when asked. Marks have not been entered in the portal.',                                                   false, false, 'escalated_to_teacher', '22222222-2222-2222-2222-222222222222', 'class_teacher', NOW()-INTERVAL '15 days', NOW()-INTERVAL '10 days'),
  -- Raised/New
  ('b1000015-0000-0000-0000-000000000015', 22, 'b0000015-0000-0000-0000-000000000015', 'infrastructure',  'The projector in the XII B classroom flickers and shuts off every 15 minutes. This disrupts lectures significantly, especially during presentations. This has been reported 3 times through the suggestion box without any response.',                  false, false, 'raised',   '22222222-2222-2222-2222-222222222222', 'council_member', NOW()-INTERVAL '2 days',  NOW()-INTERVAL '2 days');

-- ═══════════════════════════════════════════════════════════
-- SECTION 5: TIMELINE ENTRIES
-- Demo complaints + background complaints
-- ═══════════════════════════════════════════════════════════
INSERT INTO complaint_timeline (complaint_id, action, performed_by, performed_by_role, note, created_at) VALUES
  -- VOX-001 (Infrastructure, in_progress)
  ('d0000001-0000-0000-0000-000000000001', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: infrastructure.',                                                     NOW()-INTERVAL '14 days'),
  ('d0000001-0000-0000-0000-000000000001', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned to handle.',                                             NOW()-INTERVAL '13 days'),
  ('d0000001-0000-0000-0000-000000000001', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Visited the cooler location. Confirmed broken dispenser. Logged issue.',      NOW()-INTERVAL '12 days'),
  ('d0000001-0000-0000-0000-000000000001', 'Status updated to: in_progress','22222222-2222-2222-2222-222222222222', 'council_member', 'Contacted maintenance dept. Repair parts ordered. ETA 3 days.',               NOW()-INTERVAL '10 days'),

  -- VOX-002 (Safety, resolved)
  ('d0000002-0000-0000-0000-000000000002', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: safety.',                                                             NOW()-INTERVAL '30 days'),
  ('d0000002-0000-0000-0000-000000000002', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned.',                                                       NOW()-INTERVAL '29 days'),
  ('d0000002-0000-0000-0000-000000000002', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Visited basketball court. Confirmed broken tile and injury risk.',            NOW()-INTERVAL '28 days'),
  ('d0000002-0000-0000-0000-000000000002', 'Complaint resolved',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Maintenance repaired tile and placed non-slip matting. Issue fully resolved.', NOW()-INTERVAL '22 days'),

  -- VOX-003 (Academics, escalated to coordinator, anon)
  ('d0000003-0000-0000-0000-000000000003', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: academics. Anonymity requested.',                                     NOW()-INTERVAL '20 days'),
  ('d0000003-0000-0000-0000-000000000003', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned.',                                                       NOW()-INTERVAL '19 days'),
  ('d0000003-0000-0000-0000-000000000003', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Met with student. Identity protected. Issue confirmed.',                      NOW()-INTERVAL '18 days'),
  ('d0000003-0000-0000-0000-000000000003', 'Escalated to coordinator',      '22222222-2222-2222-2222-222222222222', 'council_member', 'Requires administrative intervention. Student identity kept anonymous.',       NOW()-INTERVAL '12 days'),

  -- VOX-004 (Behaviour, escalated to teacher, anon)
  ('d0000004-0000-0000-0000-000000000004', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: behaviour. Anonymity requested.',                                     NOW()-INTERVAL '18 days'),
  ('d0000004-0000-0000-0000-000000000004', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned.',                                                       NOW()-INTERVAL '17 days'),
  ('d0000004-0000-0000-0000-000000000004', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Spoke with student anonymously. Confirmed pattern of intimidation.',           NOW()-INTERVAL '16 days'),
  ('d0000004-0000-0000-0000-000000000004', 'Escalated to class teacher',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Requires teacher authority to address senior students. Identity withheld.',    NOW()-INTERVAL '11 days'),

  -- VOX-005 (Personal, raised, anon)
  ('d0000005-0000-0000-0000-000000000005', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: personal. Anonymity requested.',                                      NOW()-INTERVAL '4 days'),
  ('d0000005-0000-0000-0000-000000000005', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned. Will contact student.',                                  NOW()-INTERVAL '3 days'),

  -- VOX-006 (Infrastructure, appealed)
  ('d0000006-0000-0000-0000-000000000006', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: infrastructure.',                                                     NOW()-INTERVAL '25 days'),
  ('d0000006-0000-0000-0000-000000000006', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned.',                                                       NOW()-INTERVAL '24 days'),
  ('d0000006-0000-0000-0000-000000000006', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Tested WiFi speed in library. Confirmed low speeds during peak hours.',        NOW()-INTERVAL '23 days'),
  ('d0000006-0000-0000-0000-000000000006', 'Complaint resolved',            '22222222-2222-2222-2222-222222222222', 'council_member', 'IT upgraded the library router. Speeds now 15+ Mbps. Marked resolved.',        NOW()-INTERVAL '10 days'),
  ('d0000006-0000-0000-0000-000000000006', 'Appeal filed by student',       '11111111-1111-1111-1111-111111111111', 'student',        'Student reports WiFi still dropping after initial fix. Filing appeal.',        NOW()-INTERVAL '5 days'),

  -- VOX-007 (Other, verified)
  ('d0000007-0000-0000-0000-000000000007', 'Complaint raised',              '11111111-1111-1111-1111-111111111111', 'student',        'Domain: other.',                                                              NOW()-INTERVAL '8 days'),
  ('d0000007-0000-0000-0000-000000000007', 'Assigned to council member',    '22222222-2222-2222-2222-222222222222', 'council_member', 'Priya Verma assigned.',                                                       NOW()-INTERVAL '7 days'),
  ('d0000007-0000-0000-0000-000000000007', 'Verified in person',            '22222222-2222-2222-2222-222222222222', 'council_member', 'Spoke with canteen staff. Confirmed supply issue. Escalating to management.', NOW()-INTERVAL '6 days'),

  -- Background complaint timelines (condensed, for Priya score)
  ('b1000001-0000-0000-0000-000000000001', 'Complaint raised',    'b0000001-0000-0000-0000-000000000001', 'student',        'Domain: academics.',           NOW()-INTERVAL '58 days'),
  ('b1000001-0000-0000-0000-000000000001', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed with class.',        NOW()-INTERVAL '57 days'),
  ('b1000001-0000-0000-0000-000000000001', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Extra sessions arranged.',     NOW()-INTERVAL '40 days'),

  ('b1000002-0000-0000-0000-000000000002', 'Complaint raised',    'b0000002-0000-0000-0000-000000000002', 'student',        'Domain: infrastructure.',      NOW()-INTERVAL '55 days'),
  ('b1000002-0000-0000-0000-000000000002', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Inspected washroom.',          NOW()-INTERVAL '54 days'),
  ('b1000002-0000-0000-0000-000000000002', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Plumber fixed water supply.',  NOW()-INTERVAL '38 days'),

  ('b1000003-0000-0000-0000-000000000003', 'Complaint raised',    'b0000003-0000-0000-0000-000000000003', 'student',        'Domain: safety.',              NOW()-INTERVAL '52 days'),
  ('b1000003-0000-0000-0000-000000000003', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed loose railing.',     NOW()-INTERVAL '51 days'),
  ('b1000003-0000-0000-0000-000000000003', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Railing repaired by staff.',   NOW()-INTERVAL '36 days'),

  ('b1000004-0000-0000-0000-000000000004', 'Complaint raised',    'b0000004-0000-0000-0000-000000000004', 'student',        'Domain: behaviour. Anon.',     NOW()-INTERVAL '50 days'),
  ('b1000004-0000-0000-0000-000000000004', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Spoke with witness.',          NOW()-INTERVAL '49 days'),
  ('b1000004-0000-0000-0000-000000000004', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Counselled student. Resolved.',NOW()-INTERVAL '34 days'),

  ('b1000005-0000-0000-0000-000000000005', 'Complaint raised',    'b0000005-0000-0000-0000-000000000005', 'student',        'Domain: academics.',           NOW()-INTERVAL '47 days'),
  ('b1000005-0000-0000-0000-000000000005', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Counted working PCs.',         NOW()-INTERVAL '46 days'),
  ('b1000005-0000-0000-0000-000000000005', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', '5 PCs repaired. Lab full.',    NOW()-INTERVAL '30 days'),

  ('b1000006-0000-0000-0000-000000000006', 'Complaint raised',    'b0000006-0000-0000-0000-000000000006', 'student',        'Domain: infrastructure.',      NOW()-INTERVAL '44 days'),
  ('b1000006-0000-0000-0000-000000000006', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed AC fault.',          NOW()-INTERVAL '43 days'),
  ('b1000006-0000-0000-0000-000000000006', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'AC serviced. Cooling restored.',NOW()-INTERVAL '28 days'),

  ('b1000007-0000-0000-0000-000000000007', 'Complaint raised',    'b0000007-0000-0000-0000-000000000007', 'student',        'Domain: safety.',              NOW()-INTERVAL '42 days'),
  ('b1000007-0000-0000-0000-000000000007', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Checked expiry tag.',          NOW()-INTERVAL '41 days'),
  ('b1000007-0000-0000-0000-000000000007', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Extinguisher recertified.',    NOW()-INTERVAL '26 days'),

  ('b1000008-0000-0000-0000-000000000008', 'Complaint raised',    'b0000008-0000-0000-0000-000000000008', 'student',        'Domain: other.',               NOW()-INTERVAL '40 days'),
  ('b1000008-0000-0000-0000-000000000008', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed with bus students.',  NOW()-INTERVAL '39 days'),
  ('b1000008-0000-0000-0000-000000000008', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'New pickup point communicated.',NOW()-INTERVAL '24 days'),

  ('b1000009-0000-0000-0000-000000000009', 'Complaint raised',    'b0000009-0000-0000-0000-000000000009', 'student',        'Domain: personal. Anon.',      NOW()-INTERVAL '38 days'),
  ('b1000009-0000-0000-0000-000000000009', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Spoke with student privately.', NOW()-INTERVAL '37 days'),
  ('b1000009-0000-0000-0000-000000000009', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Matter addressed with teacher.',NOW()-INTERVAL '22 days'),

  ('b1000010-0000-0000-0000-000000000010', 'Complaint raised',    'b0000010-0000-0000-0000-000000000010', 'student',        'Domain: academics.',           NOW()-INTERVAL '36 days'),
  ('b1000010-0000-0000-0000-000000000010', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed attendance records.', NOW()-INTERVAL '35 days'),
  ('b1000010-0000-0000-0000-000000000010', 'Complaint resolved',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Sub arranged + makeup classes.',NOW()-INTERVAL '20 days'),

  ('b1000011-0000-0000-0000-000000000011', 'Complaint raised',    'b0000011-0000-0000-0000-000000000011', 'student',        'Domain: infrastructure.',      NOW()-INTERVAL '10 days'),
  ('b1000011-0000-0000-0000-000000000011', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Inspected classroom benches.',  NOW()-INTERVAL '9 days'),
  ('b1000011-0000-0000-0000-000000000011', 'Status updated to: in_progress','22222222-2222-2222-2222-222222222222','council_member','Replacement benches ordered.',  NOW()-INTERVAL '7 days'),

  ('b1000012-0000-0000-0000-000000000012', 'Complaint raised',    'b0000012-0000-0000-0000-000000000012', 'student',        'Domain: behaviour. Anon.',     NOW()-INTERVAL '7 days'),
  ('b1000012-0000-0000-0000-000000000012', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Reviewed screenshots.',        NOW()-INTERVAL '6 days'),
  ('b1000012-0000-0000-0000-000000000012', 'Status updated to: in_progress','22222222-2222-2222-2222-222222222222','council_member','Reported to cyber cell contact.',NOW()-INTERVAL '5 days'),

  ('b1000013-0000-0000-0000-000000000013', 'Complaint raised',    'b0000013-0000-0000-0000-000000000013', 'student',        'Domain: safety.',              NOW()-INTERVAL '22 days'),
  ('b1000013-0000-0000-0000-000000000013', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed CCTV outage.',       NOW()-INTERVAL '21 days'),
  ('b1000013-0000-0000-0000-000000000013', 'Escalated to coordinator','22222222-2222-2222-2222-222222222222','council_member', 'Needs admin approval for CCTV repair budget.', NOW()-INTERVAL '14 days'),

  ('b1000014-0000-0000-0000-000000000014', 'Complaint raised',    'b0000014-0000-0000-0000-000000000014', 'student',        'Domain: academics.',           NOW()-INTERVAL '15 days'),
  ('b1000014-0000-0000-0000-000000000014', 'Verified in person',  '22222222-2222-2222-2222-222222222222', 'council_member', 'Confirmed with class register.', NOW()-INTERVAL '14 days'),
  ('b1000014-0000-0000-0000-000000000014', 'Escalated to class teacher','22222222-2222-2222-2222-222222222222','council_member','Needs teacher to return papers.', NOW()-INTERVAL '10 days'),

  ('b1000015-0000-0000-0000-000000000015', 'Complaint raised',    'b0000015-0000-0000-0000-000000000015', 'student',        'Domain: infrastructure.',      NOW()-INTERVAL '2 days'),
  ('b1000015-0000-0000-0000-000000000015', 'Assigned to council member','22222222-2222-2222-2222-222222222222','council_member','Priya Verma assigned.',     NOW()-INTERVAL '2 days');

-- ═══════════════════════════════════════════════════════════
-- SECTION 6: ESCALATION RECORDS
-- ═══════════════════════════════════════════════════════════
INSERT INTO escalations (complaint_id, escalated_by, escalated_to_role, student_consent, reason, created_at) VALUES
  ('d0000003-0000-0000-0000-000000000003', '22222222-2222-2222-2222-222222222222', 'coordinator',   false, 'Academic issue affecting entire class, needs coordinator authority.',          NOW()-INTERVAL '12 days'),
  ('d0000004-0000-0000-0000-000000000004', '22222222-2222-2222-2222-222222222222', 'class_teacher', false, 'Requires teacher authority to address senior student behaviour pattern.',     NOW()-INTERVAL '11 days'),
  ('b1000013-0000-0000-0000-000000000013', '22222222-2222-2222-2222-222222222222', 'coordinator',   false, 'CCTV repair requires admin approval and budget allocation.',                  NOW()-INTERVAL '14 days'),
  ('b1000014-0000-0000-0000-000000000014', '22222222-2222-2222-2222-222222222222', 'class_teacher', false, 'Uncollected test papers — class teacher must directly retrieve and return.',  NOW()-INTERVAL '10 days');

-- ═══════════════════════════════════════════════════════════
-- SECTION 7: APPEAL (VOX-006 — library WiFi)
-- ═══════════════════════════════════════════════════════════
INSERT INTO appeals (complaint_id, student_id, reason, status, created_at) VALUES
  ('d0000006-0000-0000-0000-000000000006',
   '11111111-1111-1111-1111-111111111111',
   'The WiFi was initially fixed but continues to drop below 2 Mbps during morning peak hours (10-11 AM). The resolution note said the issue was fixed but I have speed test screenshots showing otherwise. Requesting the issue be properly diagnosed with the ISP.',
   'pending',
   NOW()-INTERVAL '5 days');

-- ═══════════════════════════════════════════════════════════
-- SECTION 8: SAMPLE NOTIFICATIONS
-- ═══════════════════════════════════════════════════════════
INSERT INTO notifications (user_id, title, body, type, is_read, created_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Complaint Updated', 'VOX-001 status updated to In Progress. Priya Verma is working on it.', 'status_update', false, NOW()-INTERVAL '10 days'),
  ('11111111-1111-1111-1111-111111111111', 'Complaint Resolved', 'VOX-002 has been resolved. The broken tile near the basketball court has been repaired.', 'resolved', true, NOW()-INTERVAL '22 days'),
  ('11111111-1111-1111-1111-111111111111', 'Complaint Escalated', 'VOX-003 has been escalated to the Coordinator for further action.', 'escalated', false, NOW()-INTERVAL '12 days'),
  ('11111111-1111-1111-1111-111111111111', 'Complaint Escalated', 'VOX-004 has been escalated to your Class Teacher.', 'escalated', false, NOW()-INTERVAL '11 days'),
  ('11111111-1111-1111-1111-111111111111', 'Appeal Received', 'Your appeal for VOX-006 has been filed and is pending review.', 'appeal', false, NOW()-INTERVAL '5 days'),
  ('22222222-2222-2222-2222-222222222222', 'New Complaint Assigned', 'VOX-005 (Personal) has been assigned to you for handling.', 'assignment', false, NOW()-INTERVAL '3 days'),
  ('22222222-2222-2222-2222-222222222222', 'New Complaint Assigned', 'VOX-007 (Other) has been assigned to you for handling.', 'assignment', true, NOW()-INTERVAL '7 days'),
  ('44444444-4444-4444-4444-444444444444', 'Complaint Escalated to You', 'VOX-003 (Academics) has been escalated to Coordinator level. Review required.', 'escalated', false, NOW()-INTERVAL '12 days'),
  ('33333333-3333-3333-3333-333333333333', 'Complaint Escalated to You', 'VOX-004 (Behaviour) has been escalated to Class Teacher. Please take action.', 'escalated', false, NOW()-INTERVAL '11 days');

SELECT
  (SELECT COUNT(*) FROM users)        AS total_users,
  (SELECT COUNT(*) FROM users WHERE role = 'student') AS students,
  (SELECT COUNT(*) FROM complaints)   AS total_complaints,
  (SELECT COUNT(*) FROM complaints WHERE student_id = '11111111-1111-1111-1111-111111111111') AS rahul_complaints,
  (SELECT COUNT(*) FROM complaint_timeline) AS timeline_entries,
  (SELECT COUNT(*) FROM appeals)      AS appeals,
  (SELECT COUNT(*) FROM notifications) AS notifications;

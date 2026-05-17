-- ═══════════════════════════════════════════════════════════════════════
-- VOX DPSI — Complete RLS Lockdown
-- Applied: 2026-05-17
--
-- Architecture: ALL data access goes through the Express backend using
-- the service_role key. service_role bypasses RLS by default in Supabase.
-- The frontend uses NO direct Supabase queries — only the backend API.
--
-- Therefore: anon and authenticated roles are EXPLICITLY BLOCKED on every
-- table using RESTRICTIVE policies. RESTRICTIVE = AND'd with all permissive
-- policies, so a later accidental permissive allow cannot override this.
--
-- auth.uid() is always NULL in this app (custom JWT, not Supabase Auth),
-- so all previous auth.uid()-based policies were dead code — dropped.
-- ═══════════════════════════════════════════════════════════════════════

-- STEP 1: Drop all old broken/dead policies
DROP POLICY IF EXISTS "Students can manage own feedback"              ON complaint_feedback;
DROP POLICY IF EXISTS "Students manage own feedback"                  ON complaint_feedback;
DROP POLICY IF EXISTS "Service role full access"                      ON complaint_votes;
DROP POLICY IF EXISTS "Service role full access"                      ON delegation_rules;
DROP POLICY IF EXISTS "Service role full access"                      ON system_config;
DROP POLICY IF EXISTS "Coordinators and principal see all erasure requests" ON erasure_requests;
DROP POLICY IF EXISTS "Users can insert own erasure requests"         ON erasure_requests;
DROP POLICY IF EXISTS "Users can see own erasure requests"            ON erasure_requests;
DROP POLICY IF EXISTS "Users see own erasure requests"                ON erasure_requests;
DROP POLICY IF EXISTS "Students can create own safe dialogue"         ON safe_dialogue;
DROP POLICY IF EXISTS "Students can view own safe dialogue"           ON safe_dialogue;

-- STEP 2: Ensure RLS is ON for every table
ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints           ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_timeline   ENABLE ROW LEVEL SECURITY;
ALTER TABLE escalations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE appeals              ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_deletions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_feedback   ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_votes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE delegation_rules     ENABLE ROW LEVEL SECURITY;
ALTER TABLE erasure_requests     ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE resolution_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE safe_dialogue        ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_config        ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_templates   ENABLE ROW LEVEL SECURITY;

-- STEP 3: RESTRICTIVE deny for anon on every table
CREATE POLICY "deny_anon" ON users                AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaints           AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaint_timeline   AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON escalations          AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON appeals              AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON notifications        AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaint_access_log AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaint_deletions  AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaint_feedback   AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON complaint_votes      AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON delegation_rules     AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON erasure_requests     AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON internal_notes       AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON resolution_templates AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON safe_dialogue        AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON suggestions          AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON system_config        AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "deny_anon" ON workflow_templates   AS RESTRICTIVE FOR ALL TO anon USING (false) WITH CHECK (false);

-- STEP 4: RESTRICTIVE deny for authenticated on every table
-- (Not using Supabase Auth — auth.uid() is always NULL — but block anyway)
CREATE POLICY "deny_authenticated" ON users                AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaints           AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaint_timeline   AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON escalations          AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON appeals              AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON notifications        AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaint_access_log AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaint_deletions  AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaint_feedback   AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON complaint_votes      AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON delegation_rules     AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON erasure_requests     AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON internal_notes       AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON resolution_templates AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON safe_dialogue        AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON suggestions          AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON system_config        AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "deny_authenticated" ON workflow_templates   AS RESTRICTIVE FOR ALL TO authenticated USING (false) WITH CHECK (false);

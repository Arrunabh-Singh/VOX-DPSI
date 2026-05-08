-- migration_skills_assignment.sql
-- Add domain_expertise TEXT[] column to users table and seed Priya Verma's expertise
-- Task #37: Skills-based assignment by domain expertise

-- 1. Add domain_expertise column (array of TEXT) to users table
ALTER TABLE users
  ADD COLUMN domain_expertise TEXT[];

-- 2. Seed Priya Verma (council@dpsi.com) with expertise in academics and personal
-- Note: Uses the known UUID from seed data; adjust if your environment differs
UPDATE users
SET domain_expertise = ARRAY['academics', 'personal']
WHERE email = 'council@dpsi.com';

-- If Priya's record doesn't exist yet (migration run before seed), this UPDATE is a no-op.
-- The column will be populated when seed runs.

COMMENT ON COLUMN users.domain_expertise IS 'List of complaint domains this council member specialises in — used for skills-based routing';

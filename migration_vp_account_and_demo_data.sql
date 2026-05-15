-- Migration: VP account + demo data distribution
-- Run at: https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql

-- 1. Insert VP account (password: demo123)
INSERT INTO users (id, name, email, password_hash, role)
VALUES (
  '77777777-7777-7777-7777-777777777777',
  'Dr. Meena Kapoor',
  'vp@dpsi.com',
  '$2a$12$rTRADgFgkTSqklzUm9jdseUptItKn5e10OKqa5Mz98RbM..Tr8pdK',
  'vice_principal'
)
ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name,
      email = EXCLUDED.email,
      role = EXCLUDED.role;

-- 2. Distribute complaint assignments across council members for demo variety
-- First check which council members exist
-- SELECT id, name FROM users WHERE role = 'council_member';

-- Distribute first 10 complaints to various council members (round-robin style)
-- This assumes at least 2 council members exist with IDs from the seed data
WITH council AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name) AS rn
  FROM users
  WHERE role = 'council_member'
),
complaints_ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) AS rn
  FROM complaints
  WHERE assigned_council_member_id IS NOT NULL
  LIMIT 20
)
UPDATE complaints c
SET assigned_council_member_id = (
  SELECT council.id
  FROM council
  WHERE council.rn = ((cr.rn - 1) % (SELECT COUNT(*) FROM council)) + 1
)
FROM complaints_ranked cr
WHERE c.id = cr.id;

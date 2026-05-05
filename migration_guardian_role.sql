-- ── Migration: Task #63 — Guardian/Parent Role ──────────────────────────────────
-- Updates the users table role constraint to include the 'guardian' role.
-- Also ensures that 'director' and 'board_member' are explicitly allowed.

DO $$
BEGIN
    -- Drop the existing constraint if it exists
    ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
    
    -- Add the new constraint with all roles
    ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN (
        'student',
        'guardian',
        'council_member',
        'class_teacher',
        'coordinator',
        'principal',
        'supervisor',
        'vice_principal',
        'director',
        'board_member',
        'external_ic_member'
    ));
END $$;

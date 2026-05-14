-- Fix: complaints status CHECK constraint missing statuses used by application code
-- Run this in Supabase SQL Editor if the constraint already exists
-- https://supabase.com/dashboard/project/gznhziptmydkalsrazpj/sql

ALTER TABLE complaints DROP CONSTRAINT IF EXISTS complaints_status_check;
ALTER TABLE complaints ADD CONSTRAINT complaints_status_check CHECK (status IN (
  'raised','verified','in_progress',
  'escalated_to_teacher','escalated_to_coordinator','escalated_to_principal',
  'resolved','closed','merged','withdrawn','archived','appealed','requires_ic','draft'
));

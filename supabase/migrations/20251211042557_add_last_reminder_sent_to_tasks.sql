/*
  # Add last_reminder_sent field to tasks table

  1. Changes
    - Add `last_reminder_sent` (timestamptz) field to `tasks` table to track when the last reminder was sent
    - Create index on (due_date, last_reminder_sent, status) for efficient reminder queries
  
  2. Purpose
    - Enables 2-hour advance reminder functionality
    - Prevents duplicate reminder notifications
    - Allows reminder reset when due_date is modified
*/

-- Add last_reminder_sent field to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'last_reminder_sent'
  ) THEN
    ALTER TABLE tasks ADD COLUMN last_reminder_sent timestamptz;
  END IF;
END $$;

-- Create index for efficient reminder queries
CREATE INDEX IF NOT EXISTS idx_tasks_reminder_check 
  ON tasks(due_date, last_reminder_sent, status) 
  WHERE due_date IS NOT NULL AND status != 'done';
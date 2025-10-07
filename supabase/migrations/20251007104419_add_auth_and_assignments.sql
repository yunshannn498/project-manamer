/*
  # Add Authentication and Multi-User Task Assignments

  1. New Tables
    - `user_task_assignments`
      - `id` (uuid, primary key)
      - `task_id` (uuid, foreign key to tasks)
      - `user_id` (uuid, foreign key to auth.users)
      - `assigned_at` (timestamptz)
      - `assigned_by` (uuid, foreign key to auth.users)
  
  2. Changes to Existing Tables
    - Add `created_by` column to tasks table
  
  3. Security
    - Enable RLS on user_task_assignments table
    - Add policies for authenticated users to manage assignments
    - Update tasks policies to allow authenticated users to see all tasks
    - Users can assign/unassign themselves and others
*/

-- Add created_by column to tasks table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE tasks ADD COLUMN created_by uuid REFERENCES auth.users(id);
  END IF;
END $$;

-- Create user_task_assignments table
CREATE TABLE IF NOT EXISTS user_task_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at timestamptz DEFAULT now(),
  assigned_by uuid REFERENCES auth.users(id),
  UNIQUE(task_id, user_id)
);

-- Enable RLS on user_task_assignments
ALTER TABLE user_task_assignments ENABLE ROW LEVEL SECURITY;

-- Drop old public policies on tasks
DROP POLICY IF EXISTS "Allow public read access" ON tasks;
DROP POLICY IF EXISTS "Allow public insert access" ON tasks;
DROP POLICY IF EXISTS "Allow public update access" ON tasks;
DROP POLICY IF EXISTS "Allow public delete access" ON tasks;

-- Create new policies for tasks (all authenticated users can see all tasks)
CREATE POLICY "Authenticated users can view all tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can create tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update all tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete all tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- Policies for user_task_assignments
CREATE POLICY "Users can view all assignments"
  ON user_task_assignments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create assignments"
  ON user_task_assignments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete assignments"
  ON user_task_assignments
  FOR DELETE
  TO authenticated
  USING (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_task_assignments_task_id ON user_task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_user_task_assignments_user_id ON user_task_assignments(user_id);
/*
  # Complete Database Schema Refactor - Clean Setup
  
  ## Overview
  This migration creates a clean, simple, and reliable task management schema
  optimized for single-user or multi-user anonymous use without authentication complexity.
  
  ## Changes Made
  
  ### 1. Clean Up Existing Schema
  - Drop unnecessary user_task_assignments table
  - Remove all foreign key constraints to auth.users
  - Clean up all existing RLS policies
  - Remove created_by column from tasks table
  
  ### 2. Optimized Tasks Table
  Core fields only:
  - `id` (uuid, primary key, auto-generated)
  - `title` (text, required)
  - `description` (text, optional, default empty)
  - `status` (text, constrained: todo/in_progress/done, default 'todo')
  - `priority` (text, constrained: low/medium/high, default 'medium')
  - `due_date` (timestamptz, optional)
  - `tags` (text array, default empty array)
  - `created_at` (timestamptz, auto-set on creation)
  - `updated_at` (timestamptz, auto-updated on modification)
  
  ### 3. Performance Optimizations
  - Index on status for filtering
  - Index on priority for sorting
  - Index on due_date for date-based queries
  - Index on created_at for chronological ordering
  - Trigger for automatic updated_at timestamp management
  
  ### 4. Security Configuration
  - Row Level Security (RLS) enabled for security best practices
  - Simple policies allowing full anonymous access
  - No authentication required for any operations
  - Suitable for personal task management applications
  
  ## Security Notes
  - This schema is designed for personal or trusted-user applications
  - Anonymous users have full CRUD access to all tasks
  - For multi-user production apps, add authentication
  - Keep your SUPABASE_ANON_KEY private
*/

-- ============================================================================
-- STEP 1: Clean up existing schema
-- ============================================================================

-- Drop the user_task_assignments table (not needed for simple task management)
DROP TABLE IF EXISTS user_task_assignments CASCADE;

-- Drop all existing policies on tasks table
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'tasks'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON tasks', policy_record.policyname);
  END LOOP;
END $$;

-- Remove foreign key constraint and created_by column if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE tasks DROP COLUMN IF EXISTS created_by CASCADE;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Ensure tasks table has correct structure
-- ============================================================================

-- Recreate tasks table with clean structure
DROP TABLE IF EXISTS tasks CASCADE;

CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- STEP 3: Create trigger for automatic updated_at management
-- ============================================================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at on row modification
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- STEP 4: Create performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON tasks USING GIN(tags);

-- ============================================================================
-- STEP 5: Configure Row Level Security (RLS)
-- ============================================================================

-- Enable RLS for security best practices
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to view all tasks
CREATE POLICY "anon_select_tasks"
  ON tasks
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anonymous users to create tasks
CREATE POLICY "anon_insert_tasks"
  ON tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow anonymous users to update any task
CREATE POLICY "anon_update_tasks"
  ON tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Policy: Allow anonymous users to delete any task
CREATE POLICY "anon_delete_tasks"
  ON tasks
  FOR DELETE
  TO anon
  USING (true);

-- Policy: Allow authenticated users to view all tasks
CREATE POLICY "authenticated_select_tasks"
  ON tasks
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to create tasks
CREATE POLICY "authenticated_insert_tasks"
  ON tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Allow authenticated users to update any task
CREATE POLICY "authenticated_update_tasks"
  ON tasks
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Policy: Allow authenticated users to delete any task
CREATE POLICY "authenticated_delete_tasks"
  ON tasks
  FOR DELETE
  TO authenticated
  USING (true);

-- ============================================================================
-- STEP 6: Grant necessary permissions
-- ============================================================================

-- Ensure anon role has all necessary permissions
GRANT ALL ON tasks TO anon;
GRANT ALL ON tasks TO authenticated;

-- Grant usage on sequences (for UUID generation)
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;

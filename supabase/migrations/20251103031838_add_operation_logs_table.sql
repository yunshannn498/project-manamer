/*
  # Add Operation Logs Table

  ## Overview
  Creates a new table to track all task operations (create, update, delete) for audit trail and history purposes.

  ## Changes Made

  ### 1. New Tables
    - `operation_logs`
      - `id` (uuid, primary key, auto-generated)
      - `operation_type` (text, constrained: created/updated/deleted)
      - `task_id` (uuid, references the task that was operated on)
      - `task_title` (text, snapshot of task title at operation time)
      - `operation_details` (jsonb, stores before/after state and additional info)
      - `user_info` (text, stores user/owner information if available)
      - `created_at` (timestamptz, timestamp of the operation)

  ### 2. Security
    - Enable RLS on `operation_logs` table
    - Add policies for anonymous users to insert and read their operation logs
    - Add policies for authenticated users to insert and read their operation logs

  ### 3. Performance
    - Index on created_at for chronological queries
    - Index on task_id for task-specific operation lookups
    - Index on operation_type for filtering by operation type
*/

-- ============================================================================
-- Create operation_logs table
-- ============================================================================

CREATE TABLE IF NOT EXISTS operation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation_type text NOT NULL CHECK (operation_type IN ('created', 'updated', 'deleted')),
  task_id uuid,
  task_title text NOT NULL,
  operation_details jsonb DEFAULT '{}',
  user_info text DEFAULT '',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- ============================================================================
-- Create performance indexes
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_operation_logs_created_at ON operation_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operation_logs_task_id ON operation_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_operation_logs_operation_type ON operation_logs(operation_type);

-- ============================================================================
-- Configure Row Level Security (RLS)
-- ============================================================================

ALTER TABLE operation_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anonymous users to view all operation logs
CREATE POLICY "anon_select_operation_logs"
  ON operation_logs
  FOR SELECT
  TO anon
  USING (true);

-- Policy: Allow anonymous users to create operation logs
CREATE POLICY "anon_insert_operation_logs"
  ON operation_logs
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Policy: Allow authenticated users to view all operation logs
CREATE POLICY "authenticated_select_operation_logs"
  ON operation_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to create operation logs
CREATE POLICY "authenticated_insert_operation_logs"
  ON operation_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================================
-- Grant necessary permissions
-- ============================================================================

GRANT SELECT, INSERT ON operation_logs TO anon;
GRANT SELECT, INSERT ON operation_logs TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;
GRANT USAGE ON SCHEMA public TO authenticated;
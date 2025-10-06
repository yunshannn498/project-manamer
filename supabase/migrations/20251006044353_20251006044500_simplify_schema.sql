/*
  # Simplify Schema - Remove Authentication and User Features

  ## Overview
  This migration simplifies the database by removing all user authentication,
  project management, and collaboration features. The application now focuses
  solely on core task management functionality.

  ## Changes Made

  ### 1. Dropped Tables
  - `task_history` - Removed audit logging
  - `project_members` - Removed project collaboration
  - `projects` - Removed project management
  - `profiles` - Removed user profiles

  ### 2. Tasks Table Modifications
  - Removed `user_id` column - no longer tracking task owners
  - Removed `project_id` column - no longer organizing by projects
  - Removed foreign key constraints to auth.users
  - Made table publicly accessible (RLS disabled for simplicity)

  ### 3. Security Changes
  - Disabled Row Level Security on tasks table
  - Removed all RLS policies
  - Removed authentication triggers and functions

  ### 4. Simplified Tasks Table Structure
  Final structure contains only core task fields:
  - `id` (uuid, primary key)
  - `title` (text, required)
  - `description` (text)
  - `status` (text: 'todo', 'in_progress', 'done')
  - `priority` (text: 'low', 'medium', 'high')
  - `due_date` (timestamptz)
  - `tags` (text array)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ## Notes
  - This is a destructive migration that drops existing data
  - All existing tasks, projects, and user data will be permanently deleted
  - The application now works as a simple, single-user task manager
  - No authentication is required to use the application
*/

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop functions
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS generate_invite_code();

-- Drop tables in correct order (respecting foreign key constraints)
DROP TABLE IF EXISTS task_history CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Create simplified tasks table
CREATE TABLE IF NOT EXISTS tasks (
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

-- Disable RLS for simplified public access
ALTER TABLE tasks DISABLE ROW LEVEL SECURITY;

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

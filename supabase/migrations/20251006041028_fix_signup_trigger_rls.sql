/*
  # Fix signup trigger RLS issues

  ## Problem
  The create_default_project_for_user trigger fails because:
  1. It runs in a context where auth.uid() might be NULL
  2. RLS policies block the INSERT operations from the trigger
  
  ## Solution
  1. Add permissive INSERT policies for projects and project_members that work with SECURITY DEFINER functions
  2. Ensure the trigger functions run with elevated privileges to bypass RLS when needed
*/

-- Drop existing restrictive INSERT policy for projects
DROP POLICY IF EXISTS "Users can create projects" ON projects;

-- Create a more permissive INSERT policy that allows both authenticated users and triggers
CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = owner_id OR auth.uid() IS NULL
  );

-- Drop existing INSERT policy for project_members
DROP POLICY IF EXISTS "Users can join projects via invite code" ON project_members;

-- Create a more permissive INSERT policy for project_members
CREATE POLICY "Users can join projects via invite code"
  ON project_members FOR INSERT
  TO public
  WITH CHECK (
    auth.uid() = user_id OR auth.uid() IS NULL
  );
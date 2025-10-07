/*
  # Enable RLS and Add Public Access Policies

  1. Security Changes
    - Enable RLS on tasks table
    - Add policy to allow public read access
    - Add policy to allow public insert access
    - Add policy to allow public update access
    - Add policy to allow public delete access
  
  Note: These are public policies since the app doesn't have authentication yet.
  When authentication is added, these should be updated to check user ownership.
*/

-- Enable RLS on tasks table
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access" ON tasks;
DROP POLICY IF EXISTS "Allow public insert access" ON tasks;
DROP POLICY IF EXISTS "Allow public update access" ON tasks;
DROP POLICY IF EXISTS "Allow public delete access" ON tasks;

-- Allow public read access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public read access"
  ON tasks
  FOR SELECT
  USING (true);

-- Allow public insert access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public insert access"
  ON tasks
  FOR INSERT
  WITH CHECK (true);

-- Allow public update access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public update access"
  ON tasks
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow public delete access (temporary - should be restricted when auth is added)
CREATE POLICY "Allow public delete access"
  ON tasks
  FOR DELETE
  USING (true);
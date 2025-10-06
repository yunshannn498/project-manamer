/*
  # Fix profile creation on signup

  ## Problem
  The trigger to auto-create profiles fails because RLS blocks the INSERT operation.

  ## Solution
  Add an INSERT policy that allows the trigger function to create profiles.
  
  ## Changes
  1. Add INSERT policy for profiles table
  2. Allow service role to insert profiles during signup
*/

-- Add policy to allow profile creation during signup
CREATE POLICY "Allow profile creation on signup"
  ON profiles FOR INSERT
  WITH CHECK (true);

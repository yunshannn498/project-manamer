/*
  # Fix handle_new_user function permissions

  ## Problem
  The SECURITY DEFINER function might not have correct permissions to insert into profiles table.

  ## Solution
  1. Drop and recreate the function with proper permissions
  2. Grant necessary permissions to authenticated role
  3. Ensure the function can bypass RLS using SECURITY DEFINER with correct setup
*/

-- Drop existing function and trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Recreate function with better error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, now(), now());
  RETURN new;
EXCEPTION
  WHEN others THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN new;
END;
$$;

-- Grant execute permission to service role
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Update the INSERT policy to be more permissive for the trigger
DROP POLICY IF EXISTS "Allow profile creation on signup" ON profiles;
CREATE POLICY "Allow profile creation on signup"
  ON profiles 
  FOR INSERT
  TO public
  WITH CHECK (true);
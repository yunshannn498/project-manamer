/*
  # Add Owner Management Policies

  1. Security Updates
    - Add policies to allow anonymous users to manage feishu_webhooks table
    - Allow INSERT for creating new owners
    - Allow UPDATE for modifying owner information
    - Allow DELETE for removing owners
  
  2. Notes
    - These policies enable the owner management UI functionality
    - Anonymous access is allowed since this is an internal tool
*/

-- Allow anonymous users to insert new owners
CREATE POLICY "Allow anonymous to insert webhooks"
  ON feishu_webhooks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous users to update owner information
CREATE POLICY "Allow anonymous to update webhooks"
  ON feishu_webhooks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- Allow anonymous users to delete owners
CREATE POLICY "Allow anonymous to delete webhooks"
  ON feishu_webhooks
  FOR DELETE
  TO anon
  USING (true);

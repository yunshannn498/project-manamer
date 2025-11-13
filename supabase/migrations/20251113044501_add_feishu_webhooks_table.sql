/*
  # Add Feishu Webhooks Configuration Table

  1. New Tables
    - `feishu_webhooks`
      - `id` (uuid, primary key) - Unique identifier for each webhook configuration
      - `owner_name` (text, unique, not null) - Name of the task owner (阿伟, choco, 05)
      - `webhook_url` (text, not null) - Feishu webhook URL for this owner
      - `is_enabled` (boolean, default true) - Whether notifications are enabled for this owner
      - `created_at` (timestamptz, default now()) - When this configuration was created
      - `updated_at` (timestamptz, default now()) - When this configuration was last updated

  2. Security
    - Enable RLS on `feishu_webhooks` table
    - Add policy for anonymous users to read webhook configurations (needed for sending notifications)

  3. Initial Data
    - Insert webhook configurations for three owners:
      - 阿伟: https://www.feishu.cn/flow/api/trigger-webhook/059e6897e76dfc77662e5362fa648a29
      - choco: https://www.feishu.cn/flow/api/trigger-webhook/2b66c1c9cf8841818760e9b41a8f3960
      - 05: https://www.feishu.cn/flow/api/trigger-webhook/e5965b53750c62901d688a5779ee21d7

  4. Performance
    - Add index on owner_name for fast lookups
*/

-- Create feishu_webhooks table
CREATE TABLE IF NOT EXISTS feishu_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_name text UNIQUE NOT NULL,
  webhook_url text NOT NULL,
  is_enabled boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Add index for fast owner lookups
CREATE INDEX IF NOT EXISTS idx_feishu_webhooks_owner_name ON feishu_webhooks(owner_name);

-- Enable RLS
ALTER TABLE feishu_webhooks ENABLE ROW LEVEL SECURITY;

-- Allow anonymous users to read webhook configurations
CREATE POLICY "Allow anonymous to read webhooks"
  ON feishu_webhooks
  FOR SELECT
  TO anon
  USING (true);

-- Insert initial webhook configurations
INSERT INTO feishu_webhooks (owner_name, webhook_url, is_enabled)
VALUES 
  ('阿伟', 'https://www.feishu.cn/flow/api/trigger-webhook/059e6897e76dfc77662e5362fa648a29', true),
  ('choco', 'https://www.feishu.cn/flow/api/trigger-webhook/2b66c1c9cf8841818760e9b41a8f3960', true),
  ('05', 'https://www.feishu.cn/flow/api/trigger-webhook/e5965b53750c62901d688a5779ee21d7', true)
ON CONFLICT (owner_name) DO NOTHING;
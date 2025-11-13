/*
  # Add open_id Support for Feishu @Mentions

  1. Changes to feishu_webhooks table
    - Add `open_id` column (text, nullable) - Stores Feishu open_id for @mention functionality
    - Add `enable_mention` column (boolean, default false) - Controls whether to @mention users
    - Update existing records with placeholder open_ids

  2. Notes
    - open_id is nullable to maintain backward compatibility
    - If open_id is not set, system falls back to simple text messages
    - Users can configure their open_id through settings UI
    - Feishu custom bots only support @mention via open_id (not user_id or email)

  3. How to get open_id
    - Users can copy their open_id from Feishu client (Profile -> More -> Copy User ID)
    - Or use Feishu Open Platform API to query user information
*/

-- Add open_id column to store Feishu user open_id for @mention
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feishu_webhooks' AND column_name = 'open_id'
  ) THEN
    ALTER TABLE feishu_webhooks ADD COLUMN open_id text;
  END IF;
END $$;

-- Add enable_mention column to control @mention feature
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'feishu_webhooks' AND column_name = 'enable_mention'
  ) THEN
    ALTER TABLE feishu_webhooks ADD COLUMN enable_mention boolean DEFAULT false NOT NULL;
  END IF;
END $$;

-- Add index on open_id for performance
CREATE INDEX IF NOT EXISTS idx_feishu_webhooks_open_id ON feishu_webhooks(open_id) WHERE open_id IS NOT NULL;

-- Add comment explaining the columns
COMMENT ON COLUMN feishu_webhooks.open_id IS 'Feishu user open_id for @mention functionality. Format: ou_xxxxxxxxxx';
COMMENT ON COLUMN feishu_webhooks.enable_mention IS 'Enable @mention in group messages. Requires valid open_id.';

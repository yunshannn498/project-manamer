/*
  # Add completed_at field to tasks table

  ## Summary
  This migration adds a timestamp field to track when tasks are completed,
  enabling proper sorting of completed tasks by completion time.

  ## Changes Made
  
  ### 1. New Column
  - `completed_at` (timestamptz, optional)
    - Records the exact timestamp when a task is marked as done
    - NULL for tasks that are not completed
    - Set automatically when status changes to 'done'
  
  ### 2. Performance Optimization
  - Add index on completed_at for efficient sorting of completed tasks
  
  ### 3. Automatic Completion Time Tracking
  - Create trigger to automatically set completed_at when status becomes 'done'
  - Clear completed_at when status changes away from 'done'
  
  ## Notes
  - Existing completed tasks will have NULL completed_at initially
  - New completions will automatically record the completion time
*/

-- ============================================================================
-- STEP 1: Add completed_at column
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'completed_at'
  ) THEN
    ALTER TABLE tasks ADD COLUMN completed_at timestamptz;
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create index for completed tasks sorting
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_tasks_completed_at ON tasks(completed_at DESC NULLS LAST) WHERE completed_at IS NOT NULL;

-- ============================================================================
-- STEP 3: Create trigger to automatically manage completed_at
-- ============================================================================

-- Function to manage completed_at timestamp
CREATE OR REPLACE FUNCTION manage_task_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- If status is being changed to 'done', set completed_at to now
  IF NEW.status = 'done' AND (OLD.status IS NULL OR OLD.status != 'done') THEN
    NEW.completed_at = now();
  END IF;
  
  -- If status is being changed from 'done' to something else, clear completed_at
  IF NEW.status != 'done' AND OLD.status = 'done' THEN
    NEW.completed_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS manage_task_completion_trigger ON tasks;
CREATE TRIGGER manage_task_completion_trigger
  BEFORE UPDATE OF status ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION manage_task_completion();

-- ============================================================================
-- STEP 4: Backfill existing completed tasks with updated_at as completed_at
-- ============================================================================

-- For existing completed tasks, use updated_at as a reasonable estimate
UPDATE tasks 
SET completed_at = updated_at 
WHERE status = 'done' AND completed_at IS NULL;

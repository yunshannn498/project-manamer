/*
  # Complete Task Management Database Schema
  
  This migration creates the entire database schema from scratch with proper authentication,
  project management, task tracking, and collaboration features.
  
  ## Tables Created
  
  ### 1. profiles
  User profile information linked to Supabase auth.users
  - `id` (uuid, primary key) - Links to auth.users.id
  - `email` (text, not null) - User's email address
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp
  
  ### 2. projects
  Project containers for organizing tasks
  - `id` (uuid, primary key) - Unique project identifier
  - `name` (text, not null) - Project name
  - `invite_code` (text, unique, not null) - Unique 8-character invite code for collaboration
  - `owner_id` (uuid, foreign key) - Links to auth.users.id (project owner)
  - `created_at` (timestamptz) - Project creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp
  
  ### 3. project_members
  Project membership tracking for collaboration
  - `id` (uuid, primary key) - Unique membership record identifier
  - `project_id` (uuid, foreign key) - Links to projects.id
  - `user_id` (uuid, foreign key) - Links to auth.users.id
  - `joined_at` (timestamptz) - Timestamp when user joined project
  - Unique constraint on (project_id, user_id) to prevent duplicate memberships
  
  ### 4. tasks
  Task items with full metadata
  - `id` (uuid, primary key) - Unique task identifier
  - `user_id` (uuid, foreign key) - Links to auth.users.id (task creator)
  - `project_id` (uuid, foreign key, nullable) - Links to projects.id
  - `title` (text, not null) - Task title
  - `description` (text) - Optional detailed description
  - `status` (text) - Task status: 'todo', 'in_progress', or 'done' (default: 'todo')
  - `priority` (text) - Priority level: 'low', 'medium', or 'high' (default: 'medium')
  - `due_date` (timestamptz, nullable) - Optional deadline
  - `tags` (text[], default: []) - Array of tags for categorization
  - `created_at` (timestamptz) - Task creation timestamp
  - `updated_at` (timestamptz) - Last modification timestamp
  
  ### 5. task_history
  Audit log for all task operations
  - `id` (uuid, primary key) - Unique history record identifier
  - `task_id` (uuid, not null) - Links to tasks.id (not FK to preserve history if task deleted)
  - `user_id` (uuid, foreign key) - Links to auth.users.id (user who performed action)
  - `action` (text, not null) - Action type: 'created', 'updated', or 'deleted'
  - `changes` (jsonb) - JSON object containing the changes made
  - `created_at` (timestamptz) - Timestamp of the action
  
  ## Security Features
  
  All tables have Row Level Security (RLS) enabled with the following policies:
  
  ### profiles
  - Users can view their own profile
  - Users can update their own profile
  - Profiles are automatically created on user signup
  
  ### projects
  - Users can view projects they are members of
  - Users can create new projects
  - Project owners can update and delete their projects
  
  ### project_members
  - Users can view members of projects they belong to
  - Users can join projects using invite codes
  - Project owners can remove members
  
  ### tasks
  - Project members can view, create, update, and delete tasks within their projects
  - Users can manage tasks without a project (personal tasks)
  
  ### task_history
  - Project members can view task history for tasks in their projects
  - Users can view history for their personal tasks
  - Users can create history entries for their actions
  
  ## Automatic Triggers
  
  1. **New User Setup**: When a user signs up, automatically:
     - Create a profile record
     - Create a default project named "我的项目"
     - Add user as a member of their default project
  
  2. All triggers run with SECURITY DEFINER to bypass RLS during setup
  
  ## Performance Indexes
  
  Indexes are created on frequently queried columns:
  - tasks: user_id, project_id, due_date, priority, status
  - projects: invite_code
  - project_members: project_id, user_id
  - task_history: task_id, created_at (descending)
*/

-- Create profiles table
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create projects table
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create project_members table
CREATE TABLE project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- Create tasks table
CREATE TABLE tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text DEFAULT '',
  status text DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
  priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  due_date timestamptz,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create task_history table
CREATE TABLE task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable Row Level Security on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Projects policies
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = projects.id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = owner_id);

-- Project members policies
CREATE POLICY "Users can view members of their projects"
  ON project_members FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join projects"
  ON project_members FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Project owners can remove members"
  ON project_members FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = project_members.project_id
      AND projects.owner_id = auth.uid()
    )
  );

-- Tasks policies
CREATE POLICY "Project members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    (project_id IS NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can create tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      project_id IS NULL
      OR
      EXISTS (
        SELECT 1 FROM project_members
        WHERE project_members.project_id = tasks.project_id
        AND project_members.user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Project members can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    (project_id IS NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    (project_id IS NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    (project_id IS NULL AND user_id = auth.uid())
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Task history policies
CREATE POLICY "Project members can view task history"
  ON task_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_history.task_id
      AND (
        (tasks.project_id IS NULL AND tasks.user_id = auth.uid())
        OR
        EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = tasks.project_id
          AND project_members.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create task history"
  ON task_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Helper function to generate unique invite codes
CREATE OR REPLACE FUNCTION generate_invite_code()
RETURNS text AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically create profile and default project for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  new_project_id uuid;
  unique_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (id, email, created_at, updated_at)
  VALUES (NEW.id, NEW.email, now(), now());
  
  -- Generate unique invite code
  LOOP
    unique_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.projects WHERE invite_code = unique_code);
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invite code after % attempts', max_attempts;
    END IF;
  END LOOP;
  
  -- Create default project
  INSERT INTO public.projects (name, invite_code, owner_id, created_at, updated_at)
  VALUES ('我的项目', unique_code, NEW.id, now(), now())
  RETURNING id INTO new_project_id;
  
  -- Add user as project member
  INSERT INTO public.project_members (project_id, user_id, joined_at)
  VALUES (new_project_id, NEW.id, now());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user setup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();

-- Create performance indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_projects_invite_code ON projects(invite_code);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_task_history_task_id ON task_history(task_id);
CREATE INDEX idx_task_history_created_at ON task_history(created_at DESC);
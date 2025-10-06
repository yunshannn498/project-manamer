/*
  # 添加项目协作功能

  ## 新增表

  ### projects 表
  - `id` (uuid, 主键) - 项目唯一标识
  - `name` (text) - 项目名称
  - `invite_code` (text, 唯一) - 邀请码
  - `owner_id` (uuid) - 项目创建者ID
  - `created_at` (timestamptz) - 创建时间
  - `updated_at` (timestamptz) - 更新时间

  ### project_members 表
  - `id` (uuid, 主键) - 成员记录唯一标识
  - `project_id` (uuid) - 项目ID
  - `user_id` (uuid) - 用户ID
  - `joined_at` (timestamptz) - 加入时间
  - 唯一约束：(project_id, user_id)

  ### task_history 表
  - `id` (uuid, 主键) - 历史记录唯一标识
  - `task_id` (uuid) - 任务ID
  - `user_id` (uuid) - 操作用户ID
  - `action` (text) - 操作类型: 'created', 'updated', 'deleted'
  - `changes` (jsonb) - 变更内容
  - `created_at` (timestamptz) - 操作时间

  ## 表结构修改
  - 为 tasks 表添加 project_id 字段，关联到项目

  ## 安全策略
  - 所有表启用 RLS
  - projects: 成员可以查看项目，所有者可以更新
  - project_members: 成员可以查看，项目所有者可以管理
  - tasks: 项目成员可以查看和操作项目内的任务
  - task_history: 项目成员可以查看历史记录

  ## 函数
  - 创建生成唯一邀请码的函数
  - 自动为用户创建默认项目
*/

-- 创建 projects 表
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  invite_code text UNIQUE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- 创建 project_members 表
CREATE TABLE IF NOT EXISTS project_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(project_id, user_id)
);

-- 创建 task_history 表
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
  changes jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- 为 tasks 表添加 project_id 字段
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'tasks' AND column_name = 'project_id'
  ) THEN
    ALTER TABLE tasks ADD COLUMN project_id uuid REFERENCES projects(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 生成唯一邀请码的函数
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

-- 为新用户创建默认项目的函数
CREATE OR REPLACE FUNCTION create_default_project_for_user()
RETURNS trigger AS $$
DECLARE
  new_project_id uuid;
  unique_code text;
  max_attempts integer := 10;
  attempt integer := 0;
BEGIN
  -- 生成唯一邀请码
  LOOP
    unique_code := generate_invite_code();
    EXIT WHEN NOT EXISTS (SELECT 1 FROM projects WHERE invite_code = unique_code);
    attempt := attempt + 1;
    IF attempt >= max_attempts THEN
      RAISE EXCEPTION 'Failed to generate unique invite code';
    END IF;
  END LOOP;

  -- 创建默认项目
  INSERT INTO projects (name, invite_code, owner_id)
  VALUES ('我的项目', unique_code, NEW.id)
  RETURNING id INTO new_project_id;

  -- 将用户添加为项目成员
  INSERT INTO project_members (project_id, user_id)
  VALUES (new_project_id, NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器：新用户注册时自动创建默认项目
DROP TRIGGER IF EXISTS on_auth_user_created_project ON auth.users;
CREATE TRIGGER on_auth_user_created_project
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_project_for_user();

-- 启用 RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

-- Projects 策略
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

-- Project Members 策略
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

CREATE POLICY "Users can join projects via invite code"
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

-- Tasks 策略更新（基于项目成员）
DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can create own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete own tasks" ON tasks;

CREATE POLICY "Project members can view tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (
    project_id IS NULL AND user_id = auth.uid()
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
    project_id IS NULL AND user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Project members can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    project_id IS NULL AND user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IS NULL AND user_id = auth.uid()
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
    project_id IS NULL AND user_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM project_members
      WHERE project_members.project_id = tasks.project_id
      AND project_members.user_id = auth.uid()
    )
  );

-- Task History 策略
CREATE POLICY "Project members can view task history"
  ON task_history FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN project_members ON project_members.project_id = tasks.project_id
      WHERE tasks.id = task_history.task_id
      AND project_members.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM tasks
      WHERE tasks.id = task_history.task_id
      AND tasks.user_id = auth.uid()
      AND tasks.project_id IS NULL
    )
  );

CREATE POLICY "Users can create task history"
  ON task_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_projects_invite_code ON projects(invite_code);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_task_history_task_id ON task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_task_history_created_at ON task_history(created_at DESC);
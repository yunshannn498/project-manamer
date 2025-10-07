/*
  # 允许匿名用户完全访问任务

  1. 策略变更
    - 允许匿名用户（anon role）对 tasks 表执行所有操作
    - 保留已有的查询策略
    - 添加匿名用户的插入、更新、删除策略
  
  2. 安全说明
    - 此策略适合个人使用的待办事项应用
    - 如需多用户支持，应添加认证系统
    - anon key 应保持私密，不要公开分享
*/

-- 删除可能存在的旧策略
DROP POLICY IF EXISTS "Anonymous users can create tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Anonymous users can delete tasks" ON tasks;

-- 允许匿名用户创建任务
CREATE POLICY "Anonymous users can create tasks"
  ON tasks
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- 允许匿名用户更新任务
CREATE POLICY "Anonymous users can update tasks"
  ON tasks
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

-- 允许匿名用户删除任务
CREATE POLICY "Anonymous users can delete tasks"
  ON tasks
  FOR DELETE
  TO anon
  USING (true);

/*
  # 创建客户备忘录表

  ## 新建表
    - `clients`
      - `id` (uuid, 主键) - 客户唯一标识
      - `client_name` (text, 必填) - 客户名称
      - `ongoing_projects` (text) - 进行中的项目描述
      - `notes` (text) - 备注信息
      - `created_at` (timestamptz) - 创建时间
      - `updated_at` (timestamptz) - 更新时间

  ## 安全性
    - 启用 RLS（行级安全）
    - 添加允许所有匿名用户完全访问的策略（读取、插入、更新、删除）

  ## 说明
    此表用于存储客户信息和相关项目备忘录
*/

-- 创建 clients 表
CREATE TABLE IF NOT EXISTS clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  ongoing_projects text DEFAULT '',
  notes text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 启用 RLS
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- 允许匿名用户查看所有客户
CREATE POLICY "Anyone can view clients"
  ON clients
  FOR SELECT
  USING (true);

-- 允许匿名用户创建客户
CREATE POLICY "Anyone can create clients"
  ON clients
  FOR INSERT
  WITH CHECK (true);

-- 允许匿名用户更新客户
CREATE POLICY "Anyone can update clients"
  ON clients
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- 允许匿名用户删除客户
CREATE POLICY "Anyone can delete clients"
  ON clients
  FOR DELETE
  USING (true);

-- 创建索引以提升查询性能
CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(client_name);
CREATE INDEX IF NOT EXISTS idx_clients_created_at ON clients(created_at DESC);
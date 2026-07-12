-- 访客自定义徽章：按邮箱持久化评论者的自定义徽章文字（如「老朋友」「潜水员」）
-- 对应 packages/db/src/schema.ts 中新增的 guest_badge 表
-- 前端「访客」页面可编辑，评论区通过公开接口 GET /api/guest-badges 拉取 email→badge 映射后渲染
CREATE TABLE IF NOT EXISTS "guest_badge" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "email" TEXT NOT NULL,
  "badge" TEXT NOT NULL,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "guest_badge_email_idx" ON "guest_badge" ("email");

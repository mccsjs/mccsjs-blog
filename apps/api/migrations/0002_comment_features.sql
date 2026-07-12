-- 评论区增强：支持嵌套回复（parent_id）与点赞（likes）
-- 对应 packages/db/src/schema.ts 中 comments 表新增字段

ALTER TABLE "comment" ADD COLUMN "parent_id" TEXT;
ALTER TABLE "comment" ADD COLUMN "likes" INTEGER DEFAULT 0;
CREATE INDEX IF NOT EXISTS "comment_parent_idx" ON "comment" ("parent_id");

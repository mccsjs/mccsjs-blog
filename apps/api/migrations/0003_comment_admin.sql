-- 评论区「博主身份」：评论是否以管理员（博主）身份发布
-- 对应 packages/db/src/schema.ts 中 comments 表新增 is_admin 字段
-- 由前端「设置」按钮登录后携带 Token 发布，后端校验并写入此标记

ALTER TABLE "comment" ADD COLUMN "is_admin" INTEGER DEFAULT 0;

-- 用户 / 会话（鉴权）
CREATE TABLE IF NOT EXISTS "user" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "email_verified" INTEGER DEFAULT 0,
  "image" TEXT,
  "password" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "user_email_idx" ON "user" ("email");

CREATE TABLE IF NOT EXISTS "session" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "user_id" TEXT NOT NULL,
  "expires_at" INTEGER NOT NULL,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "session_user_idx" ON "session" ("user_id");

-- 文章 / 分类 / 标签 / 关联 / 评论
CREATE TABLE IF NOT EXISTS "post" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "excerpt" TEXT NOT NULL DEFAULT '',
  "cover_image" TEXT,
  "published" INTEGER DEFAULT 0,
  "views" INTEGER DEFAULT 0,
  "author_id" TEXT NOT NULL,
  "category_id" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "post_slug_idx" ON "post" ("slug");
CREATE INDEX IF NOT EXISTS "post_category_idx" ON "post" ("category_id");

CREATE TABLE IF NOT EXISTS "category" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "category_name_idx" ON "category" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "category_slug_idx" ON "category" ("slug");

CREATE TABLE IF NOT EXISTS "tag" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS "tag_name_idx" ON "tag" ("name");
CREATE UNIQUE INDEX IF NOT EXISTS "tag_slug_idx" ON "tag" ("slug");

CREATE TABLE IF NOT EXISTS "post_tags" (
  "post_id" TEXT NOT NULL,
  "tag_id" TEXT NOT NULL,
  PRIMARY KEY ("post_id", "tag_id")
);

CREATE TABLE IF NOT EXISTS "comment" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "post_id" TEXT NOT NULL,
  "author" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "website" TEXT,
  "content" TEXT NOT NULL,
  "ip" TEXT,
  "region" TEXT,
  "os" TEXT,
  "browser" TEXT,
  "visible" INTEGER DEFAULT 1,
  "created_at" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "comment_post_idx" ON "comment" ("post_id");

-- 站点设置
CREATE TABLE IF NOT EXISTS "site_setting" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "site_setting_key_idx" ON "site_setting" ("key");

-- 菜单
CREATE TABLE IF NOT EXISTS "menu" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "label" TEXT NOT NULL,
  "href" TEXT,
  "icon" TEXT,
  "type" TEXT NOT NULL,
  "parent_id" TEXT,
  "sort_order" INTEGER DEFAULT 0,
  "visible" INTEGER DEFAULT 1,
  "target" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "menu_type_idx" ON "menu" ("type");
CREATE INDEX IF NOT EXISTS "menu_parent_idx" ON "menu" ("parent_id");

-- 友链
CREATE TABLE IF NOT EXISTS "friend_type" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "sort" INTEGER DEFAULT 0,
  "is_visible" INTEGER DEFAULT 1,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS "friend" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "name" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "description" TEXT DEFAULT '',
  "avatar" TEXT DEFAULT '',
  "screenshot" TEXT DEFAULT '',
  "sort" INTEGER DEFAULT 5,
  "is_invalid" INTEGER DEFAULT 0,
  "recommended" INTEGER DEFAULT 0,
  "type_id" TEXT,
  "accessible" INTEGER DEFAULT 0,
  "latency" INTEGER DEFAULT 0,
  "rss_url" TEXT,
  "rss_latime" INTEGER,
  "created_at" INTEGER NOT NULL DEFAULT 0,
  "updated_at" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "friend_sort_idx" ON "friend" ("sort");

CREATE TABLE IF NOT EXISTS "rss_article" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "friend_id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "link" TEXT NOT NULL,
  "published_at" INTEGER,
  "created_at" INTEGER NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX IF NOT EXISTS "rss_article_link_idx" ON "rss_article" ("link");
CREATE INDEX IF NOT EXISTS "rss_article_friend_idx" ON "rss_article" ("friend_id");
CREATE INDEX IF NOT EXISTS "rss_article_published_idx" ON "rss_article" ("published_at");

-- 访客日志
CREATE TABLE IF NOT EXISTS "visitor_log" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "visitor_id" TEXT NOT NULL,
  "ip" TEXT,
  "page" TEXT NOT NULL,
  "region" TEXT,
  "os" TEXT,
  "browser" TEXT,
  "referrer" TEXT,
  "created_at" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS "visitor_log_visitor_idx" ON "visitor_log" ("visitor_id");
CREATE INDEX IF NOT EXISTS "visitor_log_page_idx" ON "visitor_log" ("page");
CREATE INDEX IF NOT EXISTS "visitor_log_created_idx" ON "visitor_log" ("created_at");

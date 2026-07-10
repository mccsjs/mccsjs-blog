-- CreateTable
CREATE TABLE "rss_article" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "friend_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "link" TEXT NOT NULL,
    "published_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "rss_article_friend_id_fkey" FOREIGN KEY ("friend_id") REFERENCES "friend" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "visitor_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitor_id" TEXT NOT NULL,
    "ip" TEXT,
    "page" TEXT NOT NULL,
    "region" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "referrer" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_friend" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "avatar" TEXT NOT NULL DEFAULT '',
    "screenshot" TEXT NOT NULL DEFAULT '',
    "sort" INTEGER NOT NULL DEFAULT 5,
    "is_invalid" BOOLEAN NOT NULL DEFAULT false,
    "type_id" TEXT,
    "accessible" INTEGER NOT NULL DEFAULT 0,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "rss_url" TEXT,
    "rss_latime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "friend_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "friend_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_friend" ("accessible", "avatar", "createdAt", "description", "id", "is_invalid", "name", "screenshot", "sort", "type_id", "updatedAt", "url") SELECT "accessible", "avatar", "createdAt", "description", "id", "is_invalid", "name", "screenshot", "sort", "type_id", "updatedAt", "url" FROM "friend";
DROP TABLE "friend";
ALTER TABLE "new_friend" RENAME TO "friend";
CREATE INDEX "friend_sort_idx" ON "friend"("sort");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "rss_article_link_key" ON "rss_article"("link");

-- CreateIndex
CREATE INDEX "rss_article_friend_id_idx" ON "rss_article"("friend_id");

-- CreateIndex
CREATE INDEX "rss_article_published_at_idx" ON "rss_article"("published_at");

-- CreateIndex
CREATE INDEX "visitor_log_visitor_id_idx" ON "visitor_log"("visitor_id");

-- CreateIndex
CREATE INDEX "visitor_log_page_idx" ON "visitor_log"("page");

-- CreateIndex
CREATE INDEX "visitor_log_created_at_idx" ON "visitor_log"("created_at");

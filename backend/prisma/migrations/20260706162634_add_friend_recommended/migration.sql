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
    "recommended" BOOLEAN NOT NULL DEFAULT false,
    "type_id" TEXT,
    "accessible" INTEGER NOT NULL DEFAULT 0,
    "latency" INTEGER NOT NULL DEFAULT 0,
    "rss_url" TEXT,
    "rss_latime" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "friend_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "friend_type" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_friend" ("accessible", "avatar", "createdAt", "description", "id", "is_invalid", "latency", "name", "rss_latime", "rss_url", "screenshot", "sort", "type_id", "updatedAt", "url") SELECT "accessible", "avatar", "createdAt", "description", "id", "is_invalid", "latency", "name", "rss_latime", "rss_url", "screenshot", "sort", "type_id", "updatedAt", "url" FROM "friend";
DROP TABLE "friend";
ALTER TABLE "new_friend" RENAME TO "friend";
CREATE INDEX "friend_sort_idx" ON "friend"("sort");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

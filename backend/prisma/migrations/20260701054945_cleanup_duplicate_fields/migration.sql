/*
  Warnings:

  - You are about to drop the column `approved` on the `Comment` table. All the data in the column will be lost.
  - You are about to drop the column `access_token` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `expires_at` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `id_token` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `provider` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `providerAccountId` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `refresh_token` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `scope` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `session_state` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `token_type` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `account` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `sessionToken` on the `session` table. All the data in the column will be lost.
  - You are about to drop the column `expires` on the `verification` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "site_setting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "label" TEXT NOT NULL,
    "href" TEXT,
    "icon" TEXT,
    "type" TEXT NOT NULL,
    "parentId" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "target" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "menu_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menu" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Comment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "postId" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "website" TEXT,
    "content" TEXT NOT NULL,
    "ip" TEXT,
    "region" TEXT,
    "os" TEXT,
    "browser" TEXT,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Comment" ("author", "content", "createdAt", "email", "id", "postId") SELECT "author", "content", "createdAt", "email", "id", "postId" FROM "Comment";
DROP TABLE "Comment";
ALTER TABLE "new_Comment" RENAME TO "Comment";
CREATE TABLE "new_account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "password" TEXT,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_account" ("accessToken", "accessTokenExpiresAt", "accountId", "createdAt", "id", "idToken", "password", "providerId", "refreshToken", "refreshTokenExpiresAt", "updatedAt", "userId") SELECT "accessToken", "accessTokenExpiresAt", "accountId", "createdAt", "id", "idToken", "password", "providerId", "refreshToken", "refreshTokenExpiresAt", "updatedAt", "userId" FROM "account";
DROP TABLE "account";
ALTER TABLE "new_account" RENAME TO "account";
CREATE INDEX "account_userId_idx" ON "account"("userId");
CREATE UNIQUE INDEX "account_accountId_providerId_key" ON "account"("accountId", "providerId");
CREATE TABLE "new_session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_session" ("createdAt", "expiresAt", "id", "ipAddress", "token", "updatedAt", "userAgent", "userId") SELECT "createdAt", "expiresAt", "id", "ipAddress", "token", "updatedAt", "userAgent", "userId" FROM "session";
DROP TABLE "session";
ALTER TABLE "new_session" RENAME TO "session";
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");
CREATE INDEX "session_userId_idx" ON "session"("userId");
CREATE TABLE "new_verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL
);
INSERT INTO "new_verification" ("createdAt", "expiresAt", "id", "identifier", "updatedAt", "value") SELECT "createdAt", "expiresAt", "id", "identifier", "updatedAt", "value" FROM "verification";
DROP TABLE "verification";
ALTER TABLE "new_verification" RENAME TO "verification";
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "site_setting_key_key" ON "site_setting"("key");

-- CreateIndex
CREATE INDEX "menu_type_idx" ON "menu"("type");

-- CreateIndex
CREATE INDEX "menu_parentId_idx" ON "menu"("parentId");

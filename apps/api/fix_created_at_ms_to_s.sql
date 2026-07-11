-- 修正「2026-07-11 08:52 ~ 修复前」写入的毫秒级时间戳 → 秒级
-- 背景：packages/db/src/schema.ts 的 now() 一度被改为 Date.now()（毫秒），
--       而全站统计/趋势/时间显示均按「秒」级 Unix 时间戳处理，导致访问趋势 pv/uv 全 0。
--       修复后 now() 已恢复为 Math.floor(Date.now()/1000)（秒）。
--       本脚本仅修正修复前已写入的脏数据。
--
-- 阈值 9999999999：秒级时间戳 ≤ 10 位，毫秒级 ≥ 13 位，可精准区分，不会误伤正确数据。
-- 整数除法 created_at / 1000 在 SQLite 中对整数执行整数除，结果正确。
--
-- 执行方式（需先 wrangler login）：
--   cd apps/api
--   wrangler d1 execute mccsjsblog --remote --file=./fix_created_at_ms_to_s.sql
--
-- 安全提示：执行前建议先备份
--   wrangler d1 export mccsjsblog --remote --output=./backup-$(date +%Y%m%d).sql

UPDATE visitor_log SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE comment      SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE post         SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE post         SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE "user"       SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE "user"       SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE session      SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE site_setting SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE site_setting SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE menu         SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE menu         SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE friend_type  SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE friend_type  SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE friend       SET created_at = created_at / 1000 WHERE created_at > 9999999999;
UPDATE friend       SET updated_at = updated_at / 1000 WHERE updated_at > 9999999999;
UPDATE rss_article  SET created_at = created_at / 1000 WHERE created_at > 9999999999;

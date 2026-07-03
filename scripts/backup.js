#!/usr/bin/env node

/**
 * 文件备份脚本
 * 用法：node backup.js <file_path> [description]
 * 示例：node backup.js "D:\codex\mccsjsblog\frontend\src\styles\global.css" "修改TabNav样式"
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const BACKUP_ROOT = path.join(ROOT, '.backup');

function backupFile(filePath, description = '') {
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在，跳过备份: ${filePath}`);
    return;
  }

  const relativePath = path.relative(ROOT, filePath);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const backupFileName = `${baseName}_${timestamp}${ext}`;
  const backupDir = path.join(BACKUP_ROOT, path.dirname(relativePath));
  const backupPath = path.join(backupDir, backupFileName);

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  // 写一条记录到备份日志
  const logPath = path.join(BACKUP_ROOT, 'backup.log');
  const logEntry = `[${now.toLocaleString('zh-CN')}] ${relativePath} -> ${backupFileName}${description ? '  # ' + description : ''}\n`;
  fs.appendFileSync(logPath, logEntry, 'utf8');

  console.log(`✅ 已备份: ${relativePath}`);
  console.log(`   -> ${path.relative(ROOT, backupPath)}`);
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('用法: node backup.js <file_path> [description]');
    console.log('示例: node backup.js "D:\\codex\\mccsjsblog\\frontend\\src\\styles\\global.css" "修改样式"');
    process.exit(1);
  }

  const filePath = args[0];
  const description = args.slice(1).join(' ');
  backupFile(filePath, description);
}

main();

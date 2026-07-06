#!/usr/bin/env node

/**
 * 文件恢复脚本
 * 用法：
 *   node restore.js list <file_path>          列出某文件的所有备份
 *   node restore.js <backup_file_path>        恢复指定备份到原位置
 *   node restore.js                           交互式选择恢复
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const BACKUP_ROOT = path.join(ROOT, '.backup');

function listBackups(filePath) {
  const relativePath = path.relative(ROOT, filePath);
  const backupDir = path.join(BACKUP_ROOT, path.dirname(relativePath));
  
  if (!fs.existsSync(backupDir)) {
    console.log(`❌ 没有找到 ${relativePath} 的备份`);
    return;
  }

  const baseName = path.basename(filePath);
  const backups = fs.readdirSync(backupDir)
    .filter(f => f.startsWith(baseName + '_'))
    .sort()
    .reverse();

  if (backups.length === 0) {
    console.log(`❌ 没有找到 ${relativePath} 的备份`);
    return;
  }

  console.log(`\n📁 ${relativePath} 的备份：`);
  backups.forEach((f, i) => {
    const stats = fs.statSync(path.join(backupDir, f));
    const time = stats.mtime.toLocaleString('zh-CN');
    console.log(`  [${i + 1}] ${f}  (${time})`);
  });
  console.log(`\n恢复命令: node restore.js "${path.join(backupDir, backups[0])}"`);
}

function restoreFile(backupPath) {
  if (!fs.existsSync(backupPath)) {
    console.log(`❌ 备份文件不存在: ${backupPath}`);
    process.exit(1);
  }

  const relativeBackup = path.relative(BACKUP_ROOT, backupPath);
  const match = path.basename(relativeBackup).match(/^(.+)_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}(.*)$/);
  
  if (!match) {
    console.log(`❌ 无法解析备份文件名: ${path.basename(backupPath)}`);
    process.exit(1);
  }

  const originalName = match[1] + match[2];
  const originalPath = path.join(ROOT, path.dirname(relativeBackup), originalName);

  // 恢复前先备份当前版本
  if (fs.existsSync(originalPath)) {
    const preRestoreBackup = path.join(BACKUP_ROOT, path.dirname(relativeBackup), 
      originalName + '_pre-restore_' + new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19) + path.extname(originalName));
    fs.mkdirSync(path.dirname(preRestoreBackup), { recursive: true });
    fs.copyFileSync(originalPath, preRestoreBackup);
    console.log(`📦 恢复前已备份当前版本到: ${path.relative(ROOT, preRestoreBackup)}`);
  }

  fs.copyFileSync(backupPath, originalPath);
  console.log(`✅ 已恢复: ${path.relative(ROOT, originalPath)}`);
  console.log(`   来源: ${path.basename(backupPath)}`);
}

function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // 交互模式：显示最近的备份日志
    const logPath = path.join(BACKUP_ROOT, 'backup.log');
    if (fs.existsSync(logPath)) {
      const lines = fs.readFileSync(logPath, 'utf8').trim().split('\n').slice(-20).reverse();
      console.log('\n📋 最近 20 条备份记录：\n');
      lines.forEach((line, i) => console.log(`  [${i + 1}] ${line}`));
      console.log('\n恢复某条备份: node restore.js <备份文件路径>');
      console.log('列出文件备份: node restore.js list <原文件路径>\n');
    } else {
      console.log('暂无备份记录');
    }
    return;
  }

  const arg = args[0];
  
  if (arg === 'list') {
    if (args.length < 2) {
      console.log('用法: node restore.js list <文件路径>');
      process.exit(1);
    }
    listBackups(args[1]);
  } else {
    restoreFile(arg);
  }
}

main();

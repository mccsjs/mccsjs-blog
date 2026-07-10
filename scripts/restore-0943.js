#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const BACKUP_ROOT = path.join(ROOT, '.backup', 'src');
const TARGET_TIMESTAMP = '2026-07-05_01-43-19';

let restored = 0;
let errors = 0;

function restoreDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
  catch(e) { return; }
  
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      restoreDir(full);
    } else if (entry.isFile()) {
      if (!entry.name.includes(TARGET_TIMESTAMP)) continue;
      
      const idx = entry.name.lastIndexOf('_' + TARGET_TIMESTAMP);
      if (idx === -1) continue;
      
      const originalName = entry.name.substring(0, idx) + entry.name.substring(idx + TARGET_TIMESTAMP.length + 1);
      const relativeBackupPath = path.relative(BACKUP_ROOT, dir);
      const originalPath = path.join(ROOT, relativeBackupPath, originalName);
      
      try {
        fs.mkdirSync(path.dirname(originalPath), { recursive: true });
        fs.copyFileSync(full, originalPath);
        restored++;
        if (restored <= 10) console.log('✅ ' + path.relative(ROOT, originalPath));
      } catch(e) {
        errors++;
        console.error('❌ ' + entry.name + ': ' + e.message);
      }
    }
  }
}

console.log('🔄 开始从 09:43 备份还原...\n');
restoreDir(BACKUP_ROOT);
console.log('\n✅ 恢复完成：' + restored + ' 个文件，' + errors + ' 个错误');

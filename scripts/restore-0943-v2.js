const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const BACKUP_ROOT = path.join(ROOT, '.backup', 'src');
const TIMESTAMP = '2026-07-05_01-43-19';

let restored = 0, errors = 0;

function restoreDir(dir) {
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch(e) { return; }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { restoreDir(full); continue; }
    if (entry.isFile()) {
      const m = entry.name.match(/^(.+)_2026-07-05_01-43-19(\..+)$/);
      if (!m) continue;
      const originalName = m[1] + m[2];
      const relPath = path.relative(BACKUP_ROOT, dir);
      const destPath = path.join(ROOT, relPath, originalName);
      try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(full, destPath);
        restored++;
        if (restored <= 8) console.log('✅', path.relative(ROOT, destPath));
      } catch(e) {
        errors++;
        console.error('❌', entry.name, e.message);
      }
    }
  }
}

restoreDir(BACKUP_ROOT);
console.log(`\n恢复完成：${restored} 个文件，${errors} 个错误`);

#!/usr/bin/env node

/**
 * 项目文件自动备份监听脚本
 * 监听文件改动，自动备份修改的文件到 .backup/ 目录
 *
 * 用法：
 *   node backup-watch.js          # 开始监听（阻塞运行）
 *   node backup-watch.js once      # 立即全量备份一次然后退出
 *
 * 备份规则：
 *   - 只备份源码文件（.ts/.tsx/.js/.jsx/.astro/.vue/.css/.scss/.html/.md/.json/.yaml/.yml）
 *   - 跳过 node_modules/.git/.astro/dist/build/.workbuddy 等目录
 *   - 备份路径：.backup/src/<相对路径>/<文件名>_<时间戳>.<ext>
 */

const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const BACKUP_ROOT = path.join(ROOT, '.backup', 'src');
const LOG_PATH = path.join(ROOT, '.backup', 'backup.log');

// 跳过的目录名
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.astro', 'dist', 'build', '.workbuddy', '.qoder', '.backup',
  'uploads', 'backups', '.wrangler', '.turbo', 'coverage',
]);

// 跳过的文件扩展名（二进制/构建产物）
const IGNORE_EXTS = new Set([
  '.exe', '.dll', '.so', '.bin', '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.ico', '.webp', '.avif',
  '.woff', '.woff2', '.ttf', '.eot', '.otf',
  '.mp3', '.mp4', '.wav', '.ogg', '.webm', '.avi', '.mov',
  '.zip', '.tar', '.gz', '.rar', '.7z',
  '.map', '.min.js', '.min.css',
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
]);

function shouldBackup(filePath) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return false;
  }
  const ext = path.extname(filePath).toLowerCase();
  if (IGNORE_EXTS.has(ext)) return false;
  // 跳过 lock 文件和 min 文件
  const base = path.basename(filePath).toLowerCase();
  if (base.endsWith('.lock') || base.includes('.min.')) return false;
  return true;
}

function backupFile(filePath) {
  if (!fs.existsSync(filePath)) return false;

  const relPath = path.relative(ROOT, filePath);
  const now = new Date();
  const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19).replace('T', '_');
  const ext = path.extname(filePath);
  const baseName = path.basename(filePath, ext);
  const backupFileName = `${baseName}_${timestamp}${ext}`;
  const backupDir = path.join(BACKUP_ROOT, path.dirname(relPath));
  const backupPath = path.join(backupDir, backupFileName);

  fs.mkdirSync(backupDir, { recursive: true });
  fs.copyFileSync(filePath, backupPath);

  const logEntry = `[${now.toLocaleString('zh-CN')}] ${relPath} -> ${path.relative(ROOT, backupPath)}\n`;
  fs.appendFileSync(LOG_PATH, logEntry, 'utf8');

  console.log(`📦 已备份: ${relPath}`);
  return true;
}

function fullBackup() {
  console.log('🚀 开始全量备份...');
  let count = 0;
  function walk(dir) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); }
    catch { return; }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const rel = path.relative(ROOT, full);
        if (IGNORE_DIRS.has(entry.name) || rel.startsWith('.backup')) continue;
        walk(full);
      } else if (entry.isFile() && shouldBackup(full)) {
        if (backupFile(full)) count++;
      }
    }
  }
  walk(ROOT);
  console.log(`✅ 全量备份完成，共 ${count} 个文件\n`);
}

// ============ 主逻辑 ============

const args = process.argv.slice(2);
if (args.includes('once')) {
  fullBackup();
  process.exit(0);
}

// 检查 chokidar
let chokidar;
try {
  chokidar = require('chokidar');
} catch {
  console.log('⚠️  chokidar 未安装，正在安装...');
  require('child_process').execSync('npm install chokidar --save-dev', { cwd: ROOT, stdio: 'inherit' });
  chokidar = require('chokidar');
}

console.log('👀 开始监听文件改动...');
console.log('   项目目录:', ROOT);
console.log('   备份目录:', BACKUP_ROOT);
console.log('   Ctrl+C 停止监听\n');

// 先做全量备份
fullBackup();
console.log('👀 持续监听中...\n');

// 用 chokidar 监听，配置更宽松以提高 Windows 上 VSCode 保存的敏感度
const watcher = chokidar.watch('**/*', {
  cwd: ROOT,
  ignored: (p) => {
    const rel = path.relative(ROOT, p);
    const parts = rel.split(path.sep);
    return parts.some(p => IGNORE_DIRS.has(p) || p === '.backup');
  },
  ignoreInitial: true,
  persistent: true,
  // Windows 上 VSCode 保存时会先删再写，用这些选项更可靠
  awaitWriteFinish: {
    stabilityThreshold: 300,
    pollInterval: 100,
  },
  alwaysStat: false,
  depth: 99,
});

// 防抖计时器
const debounceMap = new Map();

function debouncedBackup(filePath) {
  const key = filePath;
  if (debounceMap.has(key)) clearTimeout(debounceMap.get(key));
  debounceMap.set(key, setTimeout(() => {
    debounceMap.delete(key);
    backupFile(filePath);
  }, 800));
}

watcher
  .on('add', (filePath) => {
    const full = path.join(ROOT, filePath);
    if (shouldBackup(full)) {
      console.log(`➕ 新文件: ${filePath}`);
      backupFile(full);
    }
  })
  .on('change', (filePath) => {
    const full = path.join(ROOT, filePath);
    if (shouldBackup(full)) {
      debouncedBackup(full);
    }
  })
  .on('unlink', (filePath) => {
    console.log(`➖ 删除文件: ${filePath}`);
  })
  .on('error', (err) => {
    console.error('❌ 监听错误:', err.message || err);
  });

// 优雅退出
process.on('SIGINT', () => {
  console.log('\n🛑 停止监听...');
  watcher.close();
  process.exit(0);
});

#!/usr/bin/env node

/**
 * Git 自动推送监听脚本
 * 监听文件改动，防抖 3 分钟后自动 commit + push
 * 
 * 用法：
 *   node git-auto-push-watch.js       # 开始监听（阻塞运行）
 *   node git-auto-push-watch.js now   # 立即执行一次然后退出
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'D:\\codex\\mccsjsblog';
const LOG_PATH = path.join(ROOT, '.backup', 'git-auto-push.log');

// 跳过的目录
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.astro', 'dist', 'build', '.workbuddy', '.qoder', '.backup',
  'uploads', 'backups',
]);

// 防抖延迟（ms）：3 分钟无改动才推送
const DEBOUNCE_DELAY = 3 * 60 * 1000;

let timer = null;
let pending = false;

function log(msg) {
  const now = new Date();
  const entry = `[${now.toLocaleString('zh-CN')}] ${msg}\n`;
  fs.appendFileSync(LOG_PATH, entry, 'utf8');
  console.log(msg);
}

function shouldWatch(filePath) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);
  for (const part of parts) {
    if (IGNORE_DIRS.has(part)) return false;
  }
  return true;
}

function getAheadCount() {
  try {
    return parseInt(
      execSync('git rev-list --count origin/main..HEAD', { cwd: ROOT, encoding: 'utf8' }).trim(),
      10
    ) || 0;
  } catch {
    return 0;
  }
}

function runGitPush() {
  try {
    // 检查是否有未提交改动
    const status = execSync('git status -s', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    const ahead = getAheadCount();

    // 既无未提交改动、也无领先远程的提交 -> 跳过
    if (!status && ahead === 0) {
      log('✅ 没有未提交改动，跳过推送');
      return;
    }

    if (status) {
      log('📝 发现未提交改动，开始推送...');
      log(`改动文件：\n${status}`);

      // git add
      execSync('git add .', { cwd: ROOT, stdio: 'inherit' });

      // git commit
      const now = new Date();
      const dateStr = now.toISOString().slice(0, 10);
      const timeStr = now.toTimeString().slice(0, 5);
      const commitMsg = `chore: 自动备份 ${dateStr} ${timeStr}`;
      execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT, stdio: 'inherit' });
    } else {
      // 改动已提交但上次 push 失败，仅补推
      log('📝 存在已提交但未推送的改动，直接推送...');
    }

    // git pull
    log('📥 拉取远程更新...');
    try {
      execSync('git pull origin main --no-edit', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      log(`⚠️ git pull 失败，继续推送：${e.message}`);
    }

    // git push
    log('📤 推送到远程...');
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });

    log('✅ Git 自动推送完成！\n');
  } catch (e) {
    log(`❌ Git 自动推送失败：${e.message}\n`);
  }
}

function schedulePush() {
  if (timer) clearTimeout(timer);
  pending = true;
  log(`⏳ 检测到文件改动，${DEBOUNCE_DELAY / 60000} 分钟无新改动后自动推送...`);
  timer = setTimeout(() => {
    pending = false;
    runGitPush();
  }, DEBOUNCE_DELAY);
}

function main() {
  const args = process.argv.slice(2);
  if (args.includes('now')) {
    runGitPush();
    process.exit(0);
  }

  // 检查 chokidar
  let chokidar;
  try {
    chokidar = require('chokidar');
  } catch {
    console.log('⚠️ chokidar 未安装，正在安装...');
    execSync('npm install chokidar --save-dev', { cwd: ROOT, stdio: 'inherit' });
    chokidar = require('chokidar');
  }

  console.log('\n👀 Git 自动推送监听已启动');
  console.log(`   项目目录: ${ROOT}`);
  console.log(`   防抖延迟: ${DEBOUNCE_DELAY / 60000} 分钟`);
  console.log(`   日志文件: ${LOG_PATH}`);
  console.log('   Ctrl+C 停止\n');

  log('✅ Git 自动推送监听已启动');

  const watcher = chokidar.watch('.', {
    cwd: ROOT,
    ignored: (p) => {
      const rel = path.relative(ROOT, p);
      const parts = rel.split(path.sep);
      return parts.some(p => IGNORE_DIRS.has(p) || p === '.backup');
    },
    ignoreInitial: true,
    persistent: true,
    awaitWriteFinish: {
      stabilityThreshold: 500,
      pollInterval: 100,
    },
    depth: 99,
  });

  watcher
    .on('ready', () => {
      log('👀 文件监听已就绪');
      // 启动兜底：若有已提交但未推送的提交（如之前代理断开导致 push 失败），直接补推
      let statusClean = true;
      try {
        statusClean = execSync('git status -s', { cwd: ROOT, encoding: 'utf8' }).trim() === '';
      } catch { /* ignore */ }
      if (statusClean && getAheadCount() > 0) {
        log('🔄 启动兜底：检测到本地有未推送提交，补推中...');
        runGitPush();
      }
    })
    .on('add', (filePath) => {
      const full = path.join(ROOT, filePath);
      if (shouldWatch(full)) schedulePush();
    })
    .on('change', (filePath) => {
      const full = path.join(ROOT, filePath);
      if (shouldWatch(full)) schedulePush();
    })
    .on('unlink', (filePath) => {
      schedulePush();
    })
    .on('error', (err) => {
      log(`❌ 监听错误: ${err.message || err}`);
    });

  process.on('SIGINT', () => {
    log('🛑 停止监听');
    watcher.close();
    if (timer) clearTimeout(timer);
    process.exit(0);
  });
}

main();

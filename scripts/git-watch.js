#!/usr/bin/env node

/**
 * Git 定时自动推送脚本
 * 使用 node-cron 每天定时执行 git add + commit + push
 * 
 * 默认配置：
 *   - 每天凌晨 2:30 执行
 *   - 只有在有未提交改动时才推送
 * 
 * 用法：
 *   node git-watch.js          # 启动定时任务（阻塞运行）
 *   node git-watch.js now      # 立即执行一次然后退出
 */

const cron = require('node-cron');
const { execSync, spawn } = require('child_process');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const LOG_PATH = path.join(ROOT, '.backup', 'git-push.log');

// Cron 表达式：每天凌晨 2:30 执行
const DEFAULT_CRON = '30 2 * * *';

function log(msg) {
  const now = new Date();
  const entry = `[${now.toLocaleString('zh-CN')}] ${msg}\n`;
  require('fs').appendFileSync(LOG_PATH, entry, 'utf8');
  console.log(msg);
}

function runGitPush() {
  log('🚀 开始 Git 自动推送...');
  
  try {
    // 1. 检查是否有未提交改动
    const status = execSync('git status -s', {
      cwd: ROOT,
      encoding: 'utf8',
    }).trim();
    
    if (!status) {
      log('✅ 没有未提交改动，跳过推送');
      return;
    }
    
    log(`发现未提交改动：\n${status}`);
    
    // 2. git add
    log('📦 添加改动到暂存区...');
    execSync('git add .', { cwd: ROOT, stdio: 'inherit' });
    
    // 3. git commit
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);
    const commitMsg = `chore: auto backup ${dateStr}`;
    log(`💬 提交改动：${commitMsg}`);
    execSync(`git commit -m "${commitMsg}"`, { cwd: ROOT, stdio: 'inherit' });
    
    // 4. git pull (先拉取远程更新)
    log('📥 拉取远程更新...');
    try {
      execSync('git pull origin main --no-edit', { cwd: ROOT, stdio: 'inherit' });
    } catch (e) {
      log(`⚠️  git pull 失败：${e.message}`);
    }
    
    // 5. git push
    log('📤 推送到远程...');
    execSync('git push origin main', { cwd: ROOT, stdio: 'inherit' });
    
    log('✅ Git 自动推送完成！\n');
    
  } catch (e) {
    log(`❌ Git 自动推送失败：${e.message}\n`);
  }
}

function main() {
  const args = process.argv.slice(2);
  
  // 立即执行一次
  if (args.includes('now')) {
    runGitPush();
    process.exit(0);
  }
  
  // 启动定时任务
  console.log('👀 Git 定时推送脚本已启动');
  console.log(`   项目目录: ${ROOT}`);
  console.log(`   定时规则: ${DEFAULT_CRON} (每天凌晨 2:30)`);
  console.log(`   日志文件: ${LOG_PATH}`);
  console.log('   Ctrl+C 停止\n');
  
  // 先做一次全量备份（可选）
  // runGitPush();
  
  // 注册定时任务
  cron.schedule(DEFAULT_CRON, () => {
    runGitPush();
  }, {
    timezone: 'Asia/Shanghai',
  });
  
  log('✅ 定时任务已注册，等待执行...');
}

main();

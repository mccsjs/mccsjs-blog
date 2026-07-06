#!/usr/bin/env node

/**
 * Git 自动推送脚本
 * 每天定时执行：git add + commit + push
 * 
 * 使用方式：
 * 1. 手动执行：node git-auto-push.js
 * 2. 定时任务：配置为每天自动运行
 */

const { execSync } = require('child_process');
const path = require('path');

const ROOT = 'D:\\codex\\mccsjsblog';
const NOW = new Date();
const DATE_STR = NOW.toISOString().slice(0, 10); // YYYY-MM-DD

function run(cmd, opts = {}) {
  try {
    const out = execSync(cmd, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: opts.silent ? 'pipe' : 'inherit',
    });
    return { ok: true, out };
  } catch (e) {
    console.error(`❌ 命令失败: ${cmd}`);
    console.error(e.message || e);
    return { ok: false, err: e.message };
  }
}

function main() {
  console.log(`\n🚀 Git 自动推送 ${DATE_STR}\n`);
  console.log('='.repeat(50));

  // 1. git status
  console.log('\n📝 检查 git 状态...');
  const status = run('git status -s', { silent: true });
  if (!status.ok || status.out.trim() === '') {
    console.log('✅ 没有未提交的改动，跳过推送\n');
    return;
  }

  console.log(`发现未提交改动：\n${status.out}`);

  // 2. git add
  console.log('\n📦 添加改动到暂存区...');
  const add = run('git add .');
  if (!add.ok) {
    console.error('❌ git add 失败，中止推送\n');
    return;
  }

  // 3. git commit
  console.log('\n💬 提交改动...');
  const commitMsg = `chore: auto backup ${DATE_STR}`;
  const commit = run(`git commit -m "${commitMsg}"`);
  if (!commit.ok) {
    console.error('❌ git commit 失败，中止推送\n');
    return;
  }

  // 4. git pull (先拉取远程更新)
  console.log('\n📥 拉取远程更新...');
  run('git pull origin main --no-edit');

  // 5. git push
  console.log('\n📤 推送到远程...');
  const push = run('git push origin main');
  if (!push.ok) {
    console.error('❌ git push 失败，请手动检查\n');
    return;
  }

  console.log('\n✅ Git 自动推送完成！\n');
  console.log('='.repeat(50));
}

main();

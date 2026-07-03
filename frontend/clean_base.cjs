const fs = require('fs');
const path = 'D:/codex/mccsjsblog/frontend/src/layouts/BaseLayout.astro';
let c = fs.readFileSync(path, 'utf8');

// 找到第二个 <script is:inline> 块的开始和结束
const secondScriptStart = c.indexOf('<script is:inline>\n  // 全局目录初始化');
if (secondScriptStart === -1) {
  console.log('未找到第二个 script 块，无需清理');
  process.exit(0);
}

const secondScriptEnd = c.indexOf('</script>', secondScriptStart + 50) + 9; // +9 for '</script>'.length
const before = c.substring(0, secondScriptStart);
const after = c.substring(secondScriptEnd);

// 清理后检查是否有多余空行
const newContent = before.replace(/\n{3,}/g, '\n\n') + after.replace(/^\n{3,}/, '\n');

fs.writeFileSync(path, newContent, 'utf8');
console.log('✅ 已删除第二个 script 块（MutationObserver 版本）');
console.log('字符数变化:', c.length, '->', newContent.length);

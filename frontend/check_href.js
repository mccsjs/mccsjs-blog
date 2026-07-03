const fs = require('fs');
const path = 'src/layouts/BaseLayout.astro';
let c = fs.readFileSync(path, 'utf8');

// 找到所有 querySelector(`href`) 并修复
// 在 Astro 文件中，这可能被渲染成了 href（无反引号）
// 我们直接检查 querySelector 调用中是否有 href 变量
const lines = c.split('\n');
let fixed = false;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('querySelector(') && lines[i].includes('href')) {
    // 检查是否是 querySelector(href)（正确）还是其他
    console.log('Line', i+1, ':', lines[i].trim());
  }
}
console.log('done');

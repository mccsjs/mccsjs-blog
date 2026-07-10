// 将 render-blocking CSS 转为异步加载，消除 Lighthouse "渲染阻塞请求" 警告
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';

const DIST = join(process.cwd(), 'dist');

// 递归遍历 dist 目录找所有 .html 文件
function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, files);
    else if (extname(p) === '.html') files.push(p);
  }
  return files;
}

const htmlFiles = walk(DIST);
let total = 0;

for (const file of htmlFiles) {
  let html = readFileSync(file, 'utf-8');

  // 匹配 Astro 生成的 CSS <link>，例如：
  // <link rel="stylesheet" href="/_astro/BaseLayout.XXXXXX.css">
  const cssRegex = /<link\s+rel="stylesheet"\s+href="(\/_astro\/[^"]+\.css)"\s*\/?>/;
  const match = html.match(cssRegex);

  if (!match) continue;

  const cssHref = match[0];       // 完整匹配到的 <link> 标签
  const cssUrl = match[1];        // CSS 文件路径

  // 替换为异步加载模式：
  // 1. preload 提供提前下载线索
  // 2. media="print" 延迟样式应用，onload 时切回 screen
  // 3. <noscript> 兜底，JS 禁用时正常加载
  const asyncCssTag = [
    `<link rel="preload" href="${cssUrl}" as="style">`,
    `<link rel="stylesheet" href="${cssUrl}" media="print" onload="this.media='all'">`,
    `<noscript><link rel="stylesheet" href="${cssUrl}"></noscript>`,
  ].join('\n');

  html = html.replace(cssRegex, asyncCssTag);
  writeFileSync(file, html, 'utf-8');
  total++;
}

console.log(`✅ 已对 ${total} 个 HTML 文件去渲染阻塞化 CSS 加载`);

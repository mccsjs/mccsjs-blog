import fs from 'node:fs';
import path from 'node:path';
import { createFont, woff2 } from 'fonteditor-core';

const projectRoot = process.cwd();
const sourceFont = path.join(projectRoot, 'public', 'font', 'b.woff2');
const subsetFont = path.join(projectRoot, 'public', 'font', 'b.subset.woff2');

// 收集站点文案 + Twikoo 评论文字，生成子集字体
const sourceRoots = [
  path.join(projectRoot, 'src'),
  path.join(projectRoot, 'public', 'scripts'),
];
const textExtensions = new Set(['.astro', '.css', '.js', '.json', '.md', '.ts', '.tsx', '.xsl']);

function collectFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) return collectFiles(filePath);
    return textExtensions.has(path.extname(entry.name).toLowerCase()) ? [filePath] : [];
  });
}

function getCodePoints(text) {
  const codePoints = new Set();
  for (const char of text) codePoints.add(char.codePointAt(0));
  return codePoints;
}

if (!fs.existsSync(sourceFont)) {
  throw new Error(`找不到完整字体：${path.relative(projectRoot, sourceFont)}`);
}

const files = sourceRoots.flatMap(collectFiles);
const content = files.map((file) => fs.readFileSync(file, 'utf8')).join('\n');

// 评论区字形：拉取 Twikoo 评论正文/昵称/属地
const TWIKOO_ENV = 'https://twikoo.mccsjs.cn';

function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

function collectPostPaths() {
  const postsRoot = path.join(projectRoot, 'src', 'content', 'posts');
  return collectFiles(postsRoot)
    .filter((file) => path.extname(file) === '.md')
    .map((file) => {
      const head = fs.readFileSync(file, 'utf8').slice(0, 2000);
      const m = head.match(/^slug:\s*["']?([^"'\r\n]+?)["']?\s*$/m);
      return `/posts/${(m ? m[1] : path.basename(file, '.md')).trim()}/`;
    });
}

async function collectTwikooText() {
  const paths = ['/comments/', '/link/', ...collectPostPaths()];
  const parts = [];
  const walk = (list) => {
    for (const c of list ?? []) {
      parts.push(String(c.nick ?? ''), String(c.ipRegion ?? ''), stripHtml(String(c.comment ?? '')));
      walk(c.replies);
    }
  };
  for (const url of paths) {
    try {
      const res = await fetch(TWIKOO_ENV, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'COMMENT_GET', url }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      walk(json.data ?? []);
    } catch (e) {
      console.warn(`跳过 ${url}：${e.message}`);
    }
  }
  return parts.join('\n');
}

let twikooText = '';
try {
  twikooText = await collectTwikooText();
  console.log(`评论文字：${[...new Set(twikooText)].length} 字符`);
} catch (e) {
  console.warn(`评论拉取失败，仅用站点文字生成子集：${e.message}`);
}

// 补上常用 ASCII 字符，保证日期、链接和今后少量英文 UI 文案不依赖系统字体。
const requiredChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
  '，。！？、；：“”‘’（）【】《》〈〉—…·℃％￥→←↑↓★☆❤❤️';
const codePoints = new Set([
  ...getCodePoints(content),
  ...getCodePoints(requiredChars),
  ...getCodePoints(twikooText),
]);

await woff2.init();
const font = createFont(fs.readFileSync(sourceFont), {
  type: 'woff2',
  subset: [...codePoints],
  hinting: true,
  kerning: true,
  compound2simple: false,
});
const output = font.write({ type: 'woff2', hinting: true, kerning: true });
fs.writeFileSync(subsetFont, Buffer.from(output));

const originalBytes = fs.statSync(sourceFont).size;
const subsetBytes = fs.statSync(subsetFont).size;
const savedBytes = originalBytes - subsetBytes;
const savedPercent = ((savedBytes / originalBytes) * 100).toFixed(1);
console.log(`已生成 ${path.relative(projectRoot, subsetFont)}`);
console.log(`字形：${codePoints.size}；${originalBytes} B → ${subsetBytes} B（减少 ${savedPercent}%）`);

import fs from 'node:fs';
import path from 'node:path';
import { createFont, woff2 } from 'fonteditor-core';

const projectRoot = process.cwd();
const sourceFont = path.join(projectRoot, 'public', 'font', 'b.woff2');
const subsetFont = path.join(projectRoot, 'public', 'font', 'b.subset.woff2');

// 仅收集会实际显示为站点文案的文件；评论、留言等访客输入由 CSS fallback 字体承接。
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

// 补上常用 ASCII 字符，保证日期、链接和今后少量英文 UI 文案不依赖系统字体。
const requiredChars =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
  ' !"#$%&\'()*+,-./:;<=>?@[\\]^_`{|}~' +
  '，。！？、；：“”‘’（）【】《》〈〉—…·℃％￥→←↑↓★☆❤❤️';
const codePoints = new Set([...getCodePoints(content), ...getCodePoints(requiredChars)]);

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

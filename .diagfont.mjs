import fs from 'node:fs';
import { woff2, Font } from 'fonteditor-core';
import opentype from './node_modules/.pnpm/@shuding+opentype.js@1.4.0-beta.0/node_modules/@shuding/opentype.js/dist/opentype.js';

const woff2buf = fs.readFileSync('./public/font/b.woff2');
await woff2.init();
const ttf = Buffer.from(woff2.decode(woff2buf));
console.log('decode ttf size:', ttf.length);

// 1) fonteditor 能否读回
try {
  const f = Font.create(ttf, { type: 'ttf' });
  console.log('fonteditor reads OK, glyphs:', f.num());
  const names = f.get({ type: 'ttf' }).names || {};
  console.log('name:', JSON.stringify(names));
  const woff1 = f.write({ type: 'woff' });
  console.log('woff1 out size:', woff1.length, 'magic:', woff1.slice(0,4).toString('hex'));
  fs.writeFileSync('./.diag.ttf', ttf);
  fs.writeFileSync('./.diag.woff', Buffer.from(woff1));
} catch (e) {
  console.log('fonteditor read FAIL:', e.message);
}

// 2) opentype.js 解析（复现 satori 报错？）
try {
  const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));
  console.log('opentype OK, glyphs:', font.glyphs?.length, 'family:', font.names?.fontFamily?.en);
} catch (e) {
  console.log('opentype FAIL:', e.message);
}

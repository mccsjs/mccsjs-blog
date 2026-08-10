import fs from 'node:fs';
import { woff2 } from 'fonteditor-core';
import satori from 'satori';

await woff2.init();
const ttf = Buffer.from(woff2.decode(fs.readFileSync('./public/font/b.woff2')));

// 测试1：传 Buffer
try {
  await satori({ type: 'div', props: { children: '测试中文' } },
    { width: 600, height: 300, fonts: [{ name: 'T', data: ttf, weight: 400, style: 'normal' }] });
  console.log('TEST1 Buffer OK');
} catch (e) { console.log('TEST1 Buffer FAIL:', e.message); }

// 测试2：传 ArrayBuffer
try {
  const ab = ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength);
  await satori({ type: 'div', props: { children: '测试中文' } },
    { width: 600, height: 300, fonts: [{ name: 'T', data: ab, weight: 400, style: 'normal' }] });
  console.log('TEST2 ArrayBuffer OK');
} catch (e) { console.log('TEST2 ArrayBuffer FAIL:', e.message); }

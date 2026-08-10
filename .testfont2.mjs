import fs from 'node:fs';
import { woff2 } from 'fonteditor-core';

const buf = fs.readFileSync('./public/font/b.woff2');
try {
  await woff2.init();
  console.log('woff2.init() OK');
  const ttf = Buffer.from(woff2.decode(buf));
  console.log('decode OK, ttf size:', ttf.length, 'magic:', ttf.slice(0,4).toString('hex'));
} catch (e) {
  console.log('FAIL:', e.message);
}

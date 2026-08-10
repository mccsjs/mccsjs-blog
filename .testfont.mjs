import fs from 'node:fs';
import { Font } from 'fonteditor-core';

const buf = fs.readFileSync('./public/font/b.woff2');
console.log('size:', buf.length, 'magic:', buf.slice(0, 4).toString('hex'));

try {
  const f = Font.create(buf);
  console.log('auto-detect OK, glyphs:', f.num());
} catch (e) {
  console.log('auto-detect FAIL:', e.message);
}

try {
  const f = Font.create(buf, { type: 'woff2' });
  console.log('woff2 explicit OK, glyphs:', f.num());
  const ttf = f.write({ type: 'ttf' });
  console.log('ttf out size:', ttf.length, 'magic:', ttf.slice(0,4).toString('hex'));
} catch (e) {
  console.log('woff2 explicit FAIL:', e.message);
}

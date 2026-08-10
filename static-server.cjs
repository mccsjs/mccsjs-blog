const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(process.cwd(), 'dist');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

http
  .createServer((req, res) => {
    let p = decodeURIComponent(req.url.split('?')[0]);
    if (p.endsWith('/')) p += 'index.html';
    const f = path.join(ROOT, p);
    fs.stat(f, (e, s) => {
      if (e || !s.isFile()) {
        res.statusCode = 404;
        res.end('404');
        return;
      }
      res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream');
      res.setHeader('Content-Length', s.size);
      const stream = fs.createReadStream(f);
      stream.on('error', () => {
        res.statusCode = 500;
        res.end('500');
      });
      stream.pipe(res);
    });
  })
  .listen(4321, () => console.log('static server ready: http://127.0.0.1:4321/  root=' + ROOT));
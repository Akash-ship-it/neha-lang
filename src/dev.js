const path = require('path');
const chokidar = require('chokidar');
const fse = require('fs-extra');
const { build } = require('./build');
const { loadConfig } = require('./config');
const log = require('./logger');
const http = require('http');
const fs = require('fs');
const url = require('url');

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.html') return 'text/html; charset=utf-8';
  if (ext === '.js' || ext === '.mjs') return 'application/javascript; charset=utf-8';
  if (ext === '.css') return 'text/css; charset=utf-8';
  if (ext === '.map') return 'application/json; charset=utf-8';
  if (ext === '.json') return 'application/json; charset=utf-8';
  if (ext === '.svg') return 'image/svg+xml';
  if (ext === '.png') return 'image/png';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  return 'text/plain; charset=utf-8';
}

async function dev({ root, port = 5173 }) {
  const cfg = await loadConfig(root);
  log.info('Starting dev build/watch');
  await build({ root, mode: 'development' });

  const rootDir = path.resolve(root, cfg.rootDir);
  const watcher = chokidar.watch(['**/*.neha'], { cwd: rootDir, ignoreInitial: true });

  const rebuild = async (file) => {
    try {
      log.info('Rebuilding due to change:', file);
      await build({ root, mode: 'development' });
    } catch (e) {
      log.error('Build failed:', e.message);
    }
  };

  watcher
    .on('add', rebuild)
    .on('change', rebuild)
    .on('unlink', rebuild);

  const outDir = path.resolve(root, cfg.outDir);
  const server = http.createServer((req, res) => {
    const parsed = url.parse(req.url);
    let pathname = decodeURIComponent(parsed.pathname || '/');
    if (pathname === '/') pathname = '/index.html';
    if (pathname.startsWith('/')) pathname = pathname.slice(1);
    const filePath = path.join(outDir, pathname);
    fs.stat(filePath, (err, stat) => {
      if (err || !stat || !stat.isFile()) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end('Not Found');
        return;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', contentType(filePath));
      fs.createReadStream(filePath).pipe(res);
    });
  });
  server.listen(port, () => {
    log.success(`Dev server running at http://localhost:${port}`);
  });

  log.info('Watching for changes in', cfg.rootDir);
}

module.exports = { dev };

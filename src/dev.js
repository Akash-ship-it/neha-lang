const path = require('path');
const fg = require('fast-glob');
const chokidar = require('chokidar');
const fse = require('fs-extra');
const { build } = require('./build');
const { loadConfig } = require('./config');
const log = require('./logger');

async function dev({ root }) {
  const cfg = loadConfig(root);
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

  log.info('Watching for changes in', cfg.rootDir);
}

module.exports = { dev };

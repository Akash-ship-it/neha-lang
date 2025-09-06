const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const fg = require('fast-glob');
const esbuild = require('esbuild');
const { loadConfig } = require('./config');
const { transform } = require('./transformer');
const { nehaStdlibPlugin } = require('./stdlib');
const log = require('./logger');

function resolvePath(root, p) { return path.resolve(root, p); }

function nehaPlugin() {
  return {
    name: 'neha-plugin',
    setup(build) {
      build.onLoad({ filter: /\.neha$/ }, async (args) => {
        const code = await fs.promises.readFile(args.path, 'utf8');
        const { code: ts } = transform(code, { filename: args.path });
        return { contents: ts, loader: 'tsx', resolveDir: path.dirname(args.path) };
      });
    }
  };
}

async function build({ root, mode = 'production' }) {
  const cfg = loadConfig(root);
  const rootDir = resolvePath(root, cfg.rootDir);
  const outDir = resolvePath(root, cfg.outDir);

  // Clean output for deterministic builds
  await fse.emptyDir(outDir);

  const entries = await fg(['**/*.neha'], { cwd: rootDir, absolute: true });
  if (entries.length === 0) {
    log.warn('No .neha files found in', cfg.rootDir);
  }

  let result;
  if (entries.length > 0) {
    result = await esbuild.build({
      entryPoints: entries,
      outdir: outDir,
      bundle: true,
      splitting: true,
      format: 'esm',
      platform: 'browser',
      sourcemap: true,
      minify: !!cfg.minify && mode === 'production',
      target: cfg.target || 'es2020',
      jsx: cfg.jsx === 'react-jsx' ? 'automatic' : 'preserve',
      plugins: [nehaPlugin(), nehaStdlibPlugin({ platform: 'browser' })],
      loader: { '.neha': 'tsx', '.css': 'css' },
      logLevel: 'silent',
    }).catch((e) => { throw e; });
  }

  // Copy static assets (everything except .neha)
  const assets = await fg(['**/*', '!**/*.neha'], { cwd: rootDir, absolute: false, onlyFiles: true, dot: true });
  for (const rel of assets) {
    const srcPath = path.join(rootDir, rel);
    const destPath = path.join(outDir, rel);
    await fse.ensureDir(path.dirname(destPath));
    await fse.copy(srcPath, destPath);
  }

  log.success('Build completed to', cfg.outDir);
  return result;
}

module.exports = { build };

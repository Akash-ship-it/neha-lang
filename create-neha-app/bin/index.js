#!/usr/bin/env node
'use strict';

const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const minimist = require('minimist');
const kleur = require('kleur');

function printHelp() {
  console.log('\ncreate-neha-app <app-name> [--template <name>]');
  console.log('\nOptions:');
  console.log('  --template, -t   Template to use (default)');
  console.log('  --help, -h       Show help');
}

async function main() {
  const argv = minimist(process.argv.slice(2));
  if (argv.h || argv.help) { printHelp(); process.exit(0); }
  const name = argv._[0];
  const template = argv.template || argv.t || 'default';
  if (!name) { printHelp(); process.exit(1); }

  // Resolve template from installed neha-lang package
  let nehaRoot;
  let usedFallback = false;
  try {
    const nehaEntry = require.resolve('neha-lang/package.json');
    nehaRoot = path.dirname(nehaEntry);
  } catch (e) {
    // Fallback: local dev when running from the monorepo
    const fallback = path.resolve(__dirname, '..', '..');
    if (fs.existsSync(path.join(fallback, 'templates'))) {
      nehaRoot = fallback;
      usedFallback = true;
    } else {
      console.error(kleur.red('Failed to resolve neha-lang. Make sure it is installed.'));
      console.error('Try: npm install -D neha-lang');
      process.exit(1);
    }
  }
  const tplDir = path.join(nehaRoot, 'templates', template);
  if (!fs.existsSync(tplDir)) {
    console.error(kleur.red(`Unknown template: ${template}`));
    process.exit(1);
  }

  const target = path.resolve(process.cwd(), name);
  await fse.copy(tplDir, target, { overwrite: false, errorOnExist: false });

  // Update package.json name
  const pkgPath = path.join(target, 'package.json');
  if (fs.existsSync(pkgPath)) {
    const pkg = JSON.parse(await fs.promises.readFile(pkgPath, 'utf8'));
    pkg.name = name;
    // When using local fallback (monorepo), set devDependency to local file path for quick testing
    if (usedFallback) {
      pkg.devDependencies = pkg.devDependencies || {};
      pkg.devDependencies['neha-lang'] = `file:${path.relative(target, nehaRoot).replace(/\\/g, '/')}`;
    }
    await fs.promises.writeFile(pkgPath, JSON.stringify(pkg, null, 2), 'utf8');
  }

  console.log(kleur.green('\n✔ Project created at'), target);
  console.log('\nNext steps:');
  console.log(`  cd ${name}`);
  console.log('  npm install');
  console.log('  npm run dev');
}

main().catch((err) => {
  console.error(kleur.red('create-neha-app failed:'), err && err.stack ? err.stack : err);
  process.exit(1);
});

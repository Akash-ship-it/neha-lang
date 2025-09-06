#!/usr/bin/env node
'use strict';

const path = require('path');
const minimist = require('minimist');
const pkg = require('../package.json');

function printHelp() {
  console.log(`\nNeha v${pkg.version}\n`);
  console.log('Usage: neha <command> [options]\n');
  console.log('Commands:');
  console.log('  init <app-name>       Create a new Neha project from template');
  console.log('  dev                   Start dev watch build');
  console.log('  build                 Build project for production');
  console.log('  check                 Type-check the project');
  console.log('  test                  Run tests (*.test.neha)');
  console.log('  -v, --version         Show version');
  console.log('  -h, --help            Show help');
}

(async function main() {
  const argv = minimist(process.argv.slice(2));
  const cmd = argv._[0];

  if (argv.v || argv.version) {
    console.log(pkg.version);
    process.exit(0);
  }
  if (!cmd || argv.h || argv.help) {
    printHelp();
    process.exit(cmd ? 0 : 1);
  }

  try {
    const root = process.cwd();
    switch (cmd) {
      case 'init': {
        const name = argv._[1];
        const template = argv.template || argv.t || 'default';
        if (!name) {
          console.error('Error: please specify app name. Example: neha init my-app');
          process.exit(1);
        }
        await require('../src/init').init({ root, name, template });
        break;
      }
      case 'dev': {
        await require('../src/dev').dev({ root });
        break;
      }
      case 'build': {
        await require('../src/build').build({ root, mode: 'production' });
        break;
      }
      case 'check': {
        const ok = await require('../src/check').check({ root });
        process.exit(ok ? 0 : 1);
        break;
      }
      case 'test': {
        const ok = await require('../src/testRunner').runTests({ root });
        process.exit(ok ? 0 : 1);
        break;
      }
      default:
        console.error(`Unknown command: ${cmd}`);
        printHelp();
        process.exit(1);
    }
  } catch (err) {
    console.error('Neha CLI failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();

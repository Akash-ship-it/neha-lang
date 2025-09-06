const path = require('path');
const fse = require('fs-extra');
const log = require('./logger');

async function init({ root, name, template = 'default' }) {
  const target = path.resolve(root, name);
  const tplDir = path.resolve(__dirname, '..', 'templates', template);
  await fse.copy(tplDir, target, { overwrite: false, errorOnExist: false });
  log.success('Project created at', target);
  log.info('Next steps:');
  console.log(`  1. cd ${name}`);
  console.log('  2. npm install');
  console.log('  3. npm run dev');
}

module.exports = { init };

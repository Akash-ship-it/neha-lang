const path = require('path');
const fs = require('fs');
const fg = require('fast-glob');
const vm = require('vm');
const esbuild = require('esbuild');
const { loadConfig } = require('./config');
const { transform } = require('./transformer');
const { nehaStdlibPlugin } = require('./stdlib');
const log = require('./logger');

function makeTestAPI() {
  const results = [];
  let currentSuite = null;
  const api = {};

  api.describe = (name, fn) => {
    const suite = { name, tests: [] };
    const prev = currentSuite;
    currentSuite = suite;
    fn();
    results.push(suite);
    currentSuite = prev;
  };

  api.test = async (name, fn) => {
    try {
      await fn();
      currentSuite.tests.push({ name, pass: true });
    } catch (e) {
      currentSuite.tests.push({ name, pass: false, error: e });
    }
  };

  function toBe(actual, expected) {
    if (actual !== expected) throw new Error(`Expected ${JSON.stringify(actual)} to be ${JSON.stringify(expected)}`);
  }
  function toHaveBeenCalledWith(mockFn, ...args) {
    const calls = mockFn.__calls || [];
    const found = calls.some(c => JSON.stringify(c) === JSON.stringify(args));
    if (!found) throw new Error(`Expected mock to be called with ${JSON.stringify(args)} but got ${JSON.stringify(calls)}`);
  }

  api.expect = (actual) => ({ toBe: (exp) => toBe(actual, exp), toHaveBeenCalledWith: (...args) => toHaveBeenCalledWith(actual, ...args) });
  api.mock = {
    fn: (impl = () => {}) => {
      const f = (...args) => { f.__calls.push(args); return impl(...args); };
      f.__calls = [];
      f.mockResolvedValue = (val) => (impl = async () => val, f);
      f.mockRejectedValue = (err) => (impl = async () => { throw err; }, f);
      return f;
    }
  };

  return { api, results };
}

function nehaPlugin() {
  return {
    name: 'neha-plugin',
    setup(build) {
      build.onLoad({ filter: /\.neha$/ }, async (args) => {
        const code = await fs.promises.readFile(args.path, 'utf8');
        const { code: ts } = transform(code, { filename: args.path });
        return { contents: ts, loader: 'tsx', resolveDir: path.dirname(args.path) };
      });
    },
  };
}

async function runTests({ root }) {
  const cfg = loadConfig(root);
  const srcDir = path.resolve(root, cfg.rootDir);
  const files = await fg(['**/*.test.neha'], { cwd: srcDir, absolute: true });
  if (files.length === 0) { log.warn('No test files found (*.test.neha)'); return true; }

  let allPass = true;
  for (const file of files) {
    const { api, results } = makeTestAPI();
    // Bundle the test with esbuild to support imports
    let output;
    try {
      const bundle = await esbuild.build({
        entryPoints: [file],
        bundle: true,
        format: 'cjs',
        platform: 'node',
        write: false,
        sourcemap: false,
        logLevel: 'silent',
        plugins: [nehaPlugin(), nehaStdlibPlugin({ platform: 'node' })],
        loader: { '.neha': 'tsx', '.css': 'text' },
      });
      output = bundle.outputFiles[0].text;
    } catch (e) {
      log.error('Failed to bundle test', file, e.message || e);
      allPass = false;
      continue;
    }

    const context = vm.createContext({ console, setTimeout, clearTimeout, global: {} ,
      describe: api.describe, test: api.test, expect: api.expect, mock: api.mock,
      require, module: { exports: {} }, exports: {}
    });
    try {
      const script = new vm.Script(output, { filename: path.basename(file) });
      await script.runInContext(context);
      // report
      console.log('\n', file);
      for (const suite of results) {
        console.log(' ', suite.name);
        for (const t of suite.tests) {
          if (t.pass) console.log('   ✓', t.name);
          else { console.log('   ✗', t.name); console.error('     ', t.error && t.error.stack || t.error); allPass = false; }
        }
      }
    } catch (e) {
      log.error('Failed to run tests for', file, e);
      allPass = false;
    }
  }

  if (allPass) log.success('All tests passed.');
  else log.error('Some tests failed.');
  return allPass;
}

module.exports = { runTests };

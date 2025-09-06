const path = require('path');
const os = require('os');
const fs = require('fs');
const fse = require('fs-extra');
const fg = require('fast-glob');
const ts = require('typescript');
const { loadConfig } = require('./config');
const { transform } = require('./transformer');
const log = require('./logger');

function looksLikeTSX(code) {
  // naive: contains '<' followed by identifier and '>'
  return /<[A-Za-z][A-Za-z0-9_:\-.]*/.test(code);
}

async function check({ root }) {
  const cfg = await loadConfig(root);
  const tmpDir = path.join(os.tmpdir(), `neha-check-${Date.now()}`);
  await fse.emptyDir(tmpDir);

  const srcDir = path.resolve(root, cfg.rootDir);
  const files = await fg(['**/*.neha'], { cwd: srcDir, absolute: true });

  const written = [];
  // Ambient types to allow JSX without requiring @types/react and to allow CSS imports
  const ambient = `
declare namespace JSX { interface IntrinsicElements { [elemName: string]: any } }
declare module '*.css' { const classes: { [key: string]: string }; export default classes; }
declare module '*?*' { const anyModule: any; export default anyModule; }
declare module '@neha/*' { const anyModule: any; export = anyModule; export default anyModule; }
declare module '@neha/test' {
  export const describe: (name: string, fn: () => void) => void;
  export const test: (name: string, fn: () => any | Promise<any>) => Promise<void> | void;
  export const expect: (actual: any) => { toBe: (exp: any) => void; toHaveBeenCalledWith: (...args: any[]) => void };
  export const mock: { fn: (impl?: (...args: any[]) => any) => any };
}
`;
  const ambientPath = path.join(tmpDir, 'ambient.d.ts');
  await fs.promises.writeFile(ambientPath, ambient, 'utf8');
  written.push(ambientPath);
  for (const file of files) {
    const code = await fs.promises.readFile(file, 'utf8');
    const { code: tsCode } = transform(code, { filename: file });
    const rel = path.relative(srcDir, file);
    const outPath = path.join(tmpDir, rel.replace(/\.neha$/, looksLikeTSX(code) ? '.tsx' : '.ts'));
    await fse.ensureDir(path.dirname(outPath));
    await fs.promises.writeFile(outPath, tsCode, 'utf8');
    written.push(outPath);
  }

  // Use tsconfig parsing to resolve correct lib files (lib.dom.d.ts, lib.es2020*.d.ts)
  const configJson = {
    compilerOptions: {
      target: 'ES2020',
      module: 'NodeNext',
      strict: cfg.strict !== false,
      noImplicitAny: cfg.noImplicitAny !== false,
      jsx: 'preserve',
      skipLibCheck: true,
      allowJs: false,
      moduleResolution: 'NodeNext',
      lib: ['ES2020', 'DOM']
    }
  };
  const parsed = ts.parseJsonConfigFileContent(configJson, ts.sys, tmpDir);
  const host = ts.createCompilerHost(parsed.options);
  const program = ts.createProgram(written, parsed.options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  if (diagnostics.length) {
    const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (f) => f,
      getNewLine: () => os.EOL,
    });
    console.error(formatted);
    log.error(`${diagnostics.length} type error(s) found.`);
    return false;
  }
  log.success('Type check passed.');
  return true;
}

module.exports = { check };

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
  const cfg = loadConfig(root);
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

  const compilerOptions = {
    target: ts.ScriptTarget.ES2020,
    module: ts.ModuleKind.ESNext,
    strict: cfg.strict !== false,
    noImplicitAny: cfg.noImplicitAny !== false,
    jsx: ts.JsxEmit.Preserve,
    skipLibCheck: true,
    allowJs: false,
    lib: ['ES2020', 'DOM'],
  };

  const host = ts.createCompilerHost(compilerOptions);
  const program = ts.createProgram(written, compilerOptions, host);
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

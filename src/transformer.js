const MagicString = require('magic-string');

// Keyword mappings (single-token). Context-sensitive handled separately
const KEYWORDS = new Map([
  ['rakh', 'let'],
  ['tay', 'const'],
  ['asthir', 'var'],
  ['agar', 'if'],
  ['warna', 'else'],
  ['liye', 'for'],
  ['jab_tak', 'while'],
  ['kaam', 'function'],
  ['de', 'return'],
  ['varg', 'class'],
  ['sach', 'true'],
  ['jhoot', 'false'],
  ['chhodo', 'continue'],
  ['tod', 'break'],
  ['ye', 'this'],
  ['intezar', 'await'],
  ['koshish', 'try'],
  ['pakad', 'catch'],
  ['akhir', 'finally'],
  ['fek', 'throw'],
  ['naya', 'new'],
  ['bhej', 'export'],
]);

// Extended identifiers mapping (safe contexts only)
const EXTENDED_IDENT = new Map([
  ['ghatevent', 'addEventListener'],
  ['hatevent', 'removeEventListener'],
  ['query', 'querySelector'],
  ['queryAll', 'querySelectorAll'],
  ['keys', 'Object.keys'],
  ['values', 'Object.values'],
  ['entries', 'Object.entries'],
  // Console aliases
  ['dikha', 'console.log'],
]);

// Helpers to determine identifier boundaries
function isIdStart(ch) {
  return /[A-Za-z_$]/.test(ch);
}
function isId(ch) {
  return /[A-Za-z0-9_$]/.test(ch);
}

function transformImports(code, s) {
  // Simple, robust line-based transform with block-comment awareness
  const reSide = /^\s*le\s+(["'])([^"']+)\1\s+se\s*;?/; // le 'mod' se;
  const reSpec = /^\s*le\s+(.+?)\s+se\s+(["'])([^"']+)\2\s*;?/; // le React, {x} se 'mod';

  let i = 0;
  const len = code.length;
  let inBlock = false;
  while (i < len) {
    const lineStart = i;
    // find end of line
    let j = i;
    while (j < len && code[j] !== '\n' && code[j] !== '\r') j++;
    const line = code.slice(lineStart, j);

    let replaced = false;
    if (!inBlock) {
      const trimmed = line.trimStart();
      if (!trimmed.startsWith('//')) {
        let m = reSide.exec(line);
        if (m) {
          const replacement = `import '${m[2]}';`;
          s.overwrite(lineStart, j, replacement);
          replaced = true;
        } else {
          m = reSpec.exec(line);
          if (m) {
            const spec = m[1].trim();
            const modulePath = m[3];
            const replacement = `import ${spec} from '${modulePath}';`;
            s.overwrite(lineStart, j, replacement);
            replaced = true;
          }
        }
      }
    }

    // update block comment state for next line (naive but sufficient)
    // count occurrences of /* and */ in this line, adjust state
    // skip ones inside string literals roughly by removing quoted substrings first
    const scrubbed = line.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g, '""').replace(/'[^'\\]*(?:\\.[^'\\]*)*'/g, "''");
    let idx = 0;
    while (idx < scrubbed.length) {
      if (!inBlock && scrubbed[idx] === '/' && scrubbed[idx + 1] === '*') { inBlock = true; idx += 2; continue; }
      if (inBlock && scrubbed[idx] === '*' && scrubbed[idx + 1] === '/') { inBlock = false; idx += 2; continue; }
      idx++;
    }

    i = j + 1; // advance to next line
  }
}

function nextLine(code, i) {
  while (i < code.length && code[i] !== '\n') i++;
  return i < code.length ? i + 1 : i;
}

function transformKeywords(code, s) {
  const len = code.length;
  let i = 0;
  let inS = false, sQuote = '';
  let inBlock = false, inLine = false;

  function skipWs(idx) { while (idx < len && /\s/.test(code[idx])) idx++; return idx; }

  while (i < len) {
    if (inLine) {
      if (code[i] === '\n') { inLine = false; }
      i++; continue;
    }
    if (inBlock) {
      if (code[i] === '*' && code[i+1] === '/') { inBlock = false; i += 2; continue; }
      i++; continue;
    }
    const ch = code[i];
    if (inS) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === sQuote) { inS = false; sQuote = ''; i++; continue; }
      if (sQuote === '`' && ch === '$' && code[i+1] === '{') {
        // enter expression area; we'll just move inside and continue scanning normally until '}'
        i += 2; // at start of expression
        let depth = 1;
        while (i < len && depth > 0) {
          const c = code[i];
          if (c === '\\') { i += 2; continue; }
          if (c === '\'' || c === '"' || c === '`') {
            // skip nested strings in template expr
            const q = c; i++;
            while (i < len && code[i] !== q) { if (code[i] === '\\') i++; i++; }
            if (i < len) i++;
            continue;
          }
          if (c === '/' && code[i+1] === '*') { i += 2; while (i < len && !(code[i] === '*' && code[i+1] === '/')) i++; if (i < len) i += 2; continue; }
          if (c === '/' && code[i+1] === '/') { while (i < len && code[i] !== '\n') i++; continue; }
          if (c === '{') depth++;
          else if (c === '}') depth--;
          i++;
        }
        continue;
      }
      i++; continue;
    }
    if (ch === '/' && code[i+1] === '/') { inLine = true; i += 2; continue; }
    if (ch === '/' && code[i+1] === '*') { inBlock = true; i += 2; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { inS = true; sQuote = ch; i++; continue; }

    if (isIdStart(ch)) {
      const start = i;
      i++;
      while (i < len && isId(code[i])) i++;
      const word = code.slice(start, i);

      // Handle 'warna agar' -> 'else if'
      if (word === 'warna') {
        const save = i;
        let j = skipWs(i);
        let nextStart = j;
        if (j < len && isIdStart(code[j])) {
          j++;
          while (j < len && isId(code[j])) j++;
          const nextWord = code.slice(nextStart, j);
          if (nextWord === 'agar') {
            s.overwrite(start, j, 'else if');
            i = j;
            continue;
          }
        }
        // otherwise normal 'else'
        s.overwrite(start, i, 'else');
        continue;
      }

      // async_kaam -> context sensitive
      if (word === 'async_kaam') {
        const j0 = skipWs(i);
        // If next token is '(' => async ( ... ) => OR call; map to 'async'
        if (code[j0] === '(') {
          s.overwrite(start, i, 'async');
          continue;
        }
        // If next token is identifier and followed by '(' => function decl
        if (isIdStart(code[j0])) {
          let j1 = j0 + 1;
          while (j1 < len && isId(code[j1])) j1++;
          const j2 = skipWs(j1);
          if (code[j2] === '(') {
            s.overwrite(start, i, 'async function');
            continue;
          }
        }
        // default to 'async'
        s.overwrite(start, i, 'async');
        continue;
      }

      // Extended ident mapping (safe: only replace when not part of member access like obj.query)
      if (EXTENDED_IDENT.has(word)) {
        // Lookbehind: if previous non-ws char is '.' then skip
        let k = start - 1;
        while (k >= 0 && /\s/.test(code[k])) k--;
        if (k >= 0 && code[k] === '.') {
          // skip member access
        } else {
          // Only replace when used in call position: next non-ws char is '('
          let f = i;
          while (f < len && /\s/.test(code[f])) f++;
          if (code[f] === '(') {
            s.overwrite(start, i, EXTENDED_IDENT.get(word));
            i = f; // continue scanning after function name toward '('
            continue;
          }
        }
      }

      // Generic keyword mapping
      if (KEYWORDS.has(word)) {
        s.overwrite(start, i, KEYWORDS.get(word));
        continue;
      }

      continue;
    }

    i++;
  }
}

function transformJSXAttributes(code, s) {
  const len = code.length;
  let i = 0;
  let inS = false, sQuote = '';
  let inBlock = false, inLine = false;
  while (i < len) {
    if (inLine) { if (code[i] === '\n') { inLine = false; } i++; continue; }
    if (inBlock) { if (code[i] === '*' && code[i+1] === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    const ch = code[i];
    if (inS) { if (ch === '\\') { i += 2; continue; } if (ch === sQuote) { inS = false; sQuote = ''; i++; continue; } i++; continue; }
    if (ch === '/' && code[i+1] === '/') { inLine = true; i += 2; continue; }
    if (ch === '/' && code[i+1] === '*') { inBlock = true; i += 2; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { inS = true; sQuote = ch; i++; continue; }
    if (ch === '<') {
      const next = code[i+1];
      // Heuristic: treat as JSX tag if next is a letter or underscore
      if (next && /[A-Za-z_]/.test(next)) {
        // inside tag until matching '>' not in quotes/braces
        let j = i + 1;
        let q = null; // quote char inside attribute value
        let brace = 0;
        while (j < len) {
          const c = code[j];
          if (!q && brace === 0 && c === '>') { j++; break; }
          if (!q && c === '{') { brace++; j++; continue; }
          if (!q && c === '}') { if (brace > 0) brace--; j++; continue; }
          if (!q && (c === '"' || c === '\'')) { q = c; j++; continue; }
          if (q) {
            if (c === '\\') { j += 2; continue; }
            if (c === q) { q = null; j++; continue; }
            j++;
            continue;
          }
          // at attribute name position outside quotes/braces
          if (code.startsWith('class=', j)) {
            s.overwrite(j, j + 6, 'className=');
            j += 10; // advance past replacement
            continue;
          }
          j++;
        }
        i = j;
        continue;
      }
    }
    i++;
  }
}

function transformMemberAliases(code, s) {
  // Replace member calls like .ghatevent( -> .addEventListener( etc.
  const len = code.length;
  let i = 0;
  let inS = false, sQuote = '';
  let inBlock = false, inLine = false;
  const memberMap = new Map([
    ['ghatevent', 'addEventListener'],
    ['hatevent', 'removeEventListener'],
    ['query', 'querySelector'],
    ['queryAll', 'querySelectorAll'],
  ]);
  while (i < len) {
    if (inLine) { if (code[i] === '\n') { inLine = false; } i++; continue; }
    if (inBlock) { if (code[i] === '*' && code[i+1] === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    const ch = code[i];
    if (inS) { if (ch === '\\') { i += 2; continue; } if (ch === sQuote) { inS = false; sQuote = ''; i++; continue; } i++; continue; }
    if (ch === '/' && code[i+1] === '/') { inLine = true; i += 2; continue; }
    if (ch === '/' && code[i+1] === '*') { inBlock = true; i += 2; continue; }
    if (ch === '\'' || ch === '"' || ch === '`') { inS = true; sQuote = ch; i++; continue; }
    if (ch === '.') {
      const start = i + 1;
      let j = start;
      if (j < len && isIdStart(code[j])) {
        j++;
        while (j < len && isId(code[j])) j++;
        const name = code.slice(start, j);
        if (memberMap.has(name)) {
          s.overwrite(start, j, memberMap.get(name));
          i = j; continue;
        }
      }
    }
    i++;
  }
}

function transform(code, opts = {}) {
  const s = new MagicString(code);
  transformImports(code, s);
  transformKeywords(code, s);
  transformJSXAttributes(code, s);
  transformMemberAliases(code, s);
  const map = s.generateMap({ hires: true, source: opts.filename || 'input.neha', includeContent: true });
  let out = s.toString();
  if (opts.inlineMap) {
    const b64 = Buffer.from(map.toString(), 'utf8').toString('base64');
    out += `\n//# sourceMappingURL=data:application/json;charset=utf-8;base64,${b64}`;
  }
  return { code: out, map };
}

module.exports = { transform };

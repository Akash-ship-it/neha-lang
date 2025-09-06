const path = require('path');

function nehaStdlibPlugin({ platform = 'browser' } = {}) {
  const ns = 'neha-virtual';
  const modules = new Map();

  // Core: console
  modules.set('@neha/core/console', `
export const log = (...a) => console.log(...a);
export const warn = (...a) => console.warn(...a);
export const error = (...a) => console.error(...a);
`);

  // Core: http
  modules.set('@neha/core/http', `
const _fetch = (globalThis.fetch);
export const fetch = _fetch.bind(globalThis);
export const Request = globalThis.Request;
export const Response = globalThis.Response;
`);

  // Core: timers
  modules.set('@neha/core/timers', `
export const setTimeout = globalThis.setTimeout.bind(globalThis);
export const setInterval = globalThis.setInterval.bind(globalThis);
export const clearTimeout = globalThis.clearTimeout.bind(globalThis);
export const clearInterval = globalThis.clearInterval.bind(globalThis);
`);

  // Web shims
  modules.set('@neha/web', `
export const DOM = (typeof document !== 'undefined' ? document : undefined);
export const Event = (typeof Event !== 'undefined' ? Event : undefined);
export const Storage = (typeof localStorage !== 'undefined' ? localStorage : undefined);
`);
  modules.set('@neha/web/routing', `
export const Router = class Router {};
export const Link = function Link(props) { return null };
export const Navigate = (to) => { if (typeof location !== 'undefined') location.href = to; };
`);

  // UI
  modules.set('@neha/ui/components', `
export const Button = (props) => null;
export const Input = (props) => null;
export const Modal = (props) => null;
`);
  modules.set('@neha/ui/theme', `
export const useTheme = () => ({ theme: 'light' });
export const ThemeProvider = (props) => null;
`);

  // Data
  modules.set('@neha/data/store', `
export const createStore = (init) => { let state = init; const subs = new Set();
  return { get: () => state, set: (v) => { state = v; subs.forEach(f=>f(state)); }, subscribe: (f)=> (subs.add(f), ()=>subs.delete(f)) } };
export const useStore = (store) => store.get();
`);
  modules.set('@neha/data/query', `
export class Query { constructor(fn){ this.fn = fn } async run(){ return this.fn() } }
export class Mutation { constructor(fn){ this.fn = fn } async run(v){ return this.fn(v) } }
`);

  // React bindings (minimal placeholders)
  modules.set('@neha/react', `
export const createNehaComponent = (c) => c;
export const useNehaState = (v) => [v, () => {}];
`);

  // Next.js bindings (placeholders)
  modules.set('@neha/nextjs', `
export const NehaPage = (c) => c;
export const NehaAPI = (h) => h;
`);

  // Tailwind utils
  modules.set('@neha/tailwind', `
export const cn = (...cls) => cls.filter(Boolean).join(' ');
export const tw = (...cls) => cls.filter(Boolean).join(' ');
export const variants = (base, v) => (opts={}) => [base, ...(Object.entries(v||{}).flatMap(([k,m])=> m[opts[k]]||[]))].join(' ');
`);

  // Dev tools
  modules.set('@neha/dev-tools', `
export const debug = {
  start: (name) => { if (console.time) console.time(name); },
  end: (name) => { if (console.timeEnd) console.timeEnd(name); },
  log: (...a) => console.log('[debug]', ...a),
  error: (...a) => console.error('[debug]', ...a),
};
export const trace = (...a) => console.trace(...a);
export const profile = (name) => ({ stop: () => {} });
`);

  // Testing utilities (used by test runner)
  modules.set('@neha/test', `
export const describe = globalThis.describe;
export const test = globalThis.test;
export const expect = globalThis.expect;
export const mock = globalThis.mock;
`);

  return {
    name: 'neha-stdlib-plugin',
    setup(build) {
      // Resolve @neha/* to virtual namespace
      build.onResolve({ filter: /^@neha\// }, (args) => {
        if (modules.has(args.path)) {
          return { path: args.path, namespace: ns };
        }
        // otherwise leave to normal resolution
        return null;
      });

      // Load virtual contents
      build.onLoad({ filter: /.*/, namespace: ns }, (args) => {
        const contents = modules.get(args.path);
        if (!contents) return { errors: [{ text: `Unknown stdlib module: ${args.path}` }] };
        return { contents, loader: 'js', resolveDir: process.cwd() };
      });
    }
  };
}

module.exports = { nehaStdlibPlugin };

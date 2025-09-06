# Neha Language (neha-lang)

A production-grade compiler and CLI for the Neha programming language — a Hindi-keyworded, statically-typed language that compiles to modern TypeScript/JavaScript for the web.

## Features

- Hindi → JS/TS keyword transformation
- Import/export syntax: `le ... se 'module'` and `bhej ...`
- Async/await, classes, control flow, loops
- JSX/TSX support (React/Next.js friendly)
- Esbuild-based build pipeline with source maps
- `neha check` type checking via TypeScript
- `neha test` minimal test framework
- `neha init` starter template

## CLI

- `neha init <app-name>`
- `neha dev`
- `neha build`
- `neha check`
- `neha test`

## Example (Neha)

```neha
le React, { useState } se 'react';

aSync_kaam is not valid; use async_kaam
kaam App(): JSX.Element {
  tay [count, setCount] = useState<number>(0);
  de (
    <button onClick={() => setCount(count + 1)}>
      आपने {count} बार click किया है
    </button>
  );
}

bhej default App;
```

## Development

- Node >= 18 is required
- Install dependencies: `npm install`
- Run CLI: `node bin/neha.js --help`

## License

MIT

## Publish to npm

This repo contains two publishable packages:

1. `neha-lang` (the compiler/CLI)
2. `create-neha-app` (the scaffolder)

Prepare metadata in `package.json` files (already configured). Then:

```bash
# from repo root for neha-lang
npm publish --access public

# from repo root/create-neha-app for scaffolder
cd create-neha-app
npm publish --access public
```

Tip: test the tarballs locally before publishing:

```bash
# build tarball for neha-lang
npm pack

# build tarball for create-neha-app
cd create-neha-app
npm pack
```

## Usage after publish

Install CLI globally (optional):

```bash
npm i -g neha-lang
neha --help
```

Create a new app via npm create (recommended):

```bash
npm create neha-app@latest my-app
cd my-app
npm install
npm run dev
```

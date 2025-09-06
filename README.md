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

- Node >= 16 is required
- Install dependencies: `npm install`
- Run CLI: `node bin/neha.js --help`

## License

MIT

# create-neha-app

Official scaffolder for the Neha programming language. Quickly bootstrap a Neha project from the official templates.

## Usage

- Using npm create (recommended):

```bash
npm create neha-app@latest my-app
```

- Using npx:

```bash
npx create-neha-app@latest my-app
```

- Options:

```bash
create-neha-app <app-name> [--template <name>]

# Examples
create-neha-app my-app
create-neha-app my-app --template default
```

## Templates

- `default`: Basic web app target with `src/index.neha`, `src/index.html`, `src/style.css`, `neha.config.js`.

## After creating the app

```bash
cd my-app
npm install
npm run dev
```

## Local development (for contributors)

This package looks for the installed `neha-lang` package. If it cannot be resolved, it falls back to a local sibling (monorepo-style) at `../..` so that you can test it without publishing first.

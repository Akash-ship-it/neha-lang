const path = require('path');
const fs = require('fs');

const defaultConfig = {
  target: 'es2020',
  module: 'esnext',
  jsx: 'automatic',
  outDir: './dist',
  rootDir: './src',
  strict: true,
  noImplicitAny: true,
  minify: false,
  treeshake: true,
  frameworks: {
    react: { version: '18', runtime: 'automatic' },
  },
};

function loadConfig(root) {
  const configPath = path.join(root, 'neha.config.js');
  if (fs.existsSync(configPath)) {
    try {
      const cfg = require(configPath);
      return { ...defaultConfig, ...cfg };
    } catch (e) {
      // fallback to default with warning
      console.warn('[neha] Failed to load neha.config.js, using defaults:', e.message);
    }
  }
  return { ...defaultConfig };
}

module.exports = { loadConfig, defaultConfig };

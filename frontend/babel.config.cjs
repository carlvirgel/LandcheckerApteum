// Used by Jest only — Vite compiles the app itself.

// Jest runs CommonJS, where `import.meta` is a syntax error. Some ESM-only
// dependencies (react-router) reference `import.meta.hot`, so swap it for `{}`.
function importMetaShim({ types: t }) {
  return {
    name: 'import-meta-shim',
    visitor: {
      MetaProperty(path) {
        if (path.node.meta.name === 'import' && path.node.property.name === 'meta') {
          path.replaceWith(t.objectExpression([]))
        }
      },
    },
  }
}

module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }],
    ['@babel/preset-react', { runtime: 'automatic' }],
    '@babel/preset-typescript',
  ],
  plugins: [importMetaShim],
}

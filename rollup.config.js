const nodeResolve = require('@rollup/plugin-node-resolve');
const sourcemaps = require('rollup-plugin-sourcemaps');
const terser = require('@rollup/plugin-terser');
const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

function trimUmd() {
  // noinspection JSUnusedGlobalSymbols
  return {
    name: 'mixExports',
    renderChunk(code, _chunk, options) {
      if (options.format === 'umd') {
        // Strip out dynamic import() so it doesn't generate warnings.
        code = code.replace(/return import\(.*?\/\* webpackIgnore: true \*\/.*?tseuqer-yb.*?\.join\(''\)\)/s, 'return null');
        // Strip out large and large-alt timezone definitions from UMD build.
        code = code.replace(/(?<!timezoneSmall = )\/\* trim-file-start \*\/.*?\/\* trim-file-end \*\//sg, 'null');
      }

      return { code, map: null };
    }
  };
}

const plugins = [
  nodeResolve(),
  typescript({ inlineSources: true }),
  trimUmd(),
  sourcemaps(),
  terser({
    output: {
      comments: (node, comment) => {
        return comment.type === 'comment2' && /\b(webpackIgnore|vite-ignore)\b/.test(comment.value);
      },
      max_line_len: 511
    },
    sourceMap: { includeSources: true }
  })
];

const onwarn = (code, defaultHandler) => {
  if (code.code !== 'MIXED_EXPORTS')
    defaultHandler(code);
};

// noinspection JSUnusedGlobalSymbols,CommaExpressionJS
module.exports = [
  {
    input: 'src/index.ts',
    output: {
      file: pkg.browser,
      sourcemap: true,
      format: 'umd',
      name: 'tbTime',
      globals: {
        'json-z': 'JSONZ',
        '@tubular/math': 'tbMath',
        '@tubular/util': 'tbUtil',
        'by-request': '_by_request_' // Never used, only specified to suppress warning
      }
    },
    plugins,
    onwarn
  },
  {
    external: ['by-request', 'json-z', '@tubular/math', '@tubular/util'],
    input: 'src/index.ts',
    output: [
      {
        file: pkg.main,
        sourcemap: true,
        format: 'cjs'
      },
      {
        file: pkg.module,
        sourcemap: true,
        format: 'esm'
      }
    ],
    plugins: (plugins.slice(0).splice(0, 1).splice(2, 1), plugins),
    onwarn
  }
];

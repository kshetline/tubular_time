const sourcemaps = require('rollup-plugin-sourcemaps');
const terser = require('@rollup/plugin-terser');
const typescript = require('@rollup/plugin-typescript');
const pkg = require('./package.json');

// noinspection JSUnusedGlobalSymbols
module.exports = [{
  external: ['by-request', 'json-z', '@tubular/math', '@tubular/util'],
  input: 'src/index.ts',
  output: [
    {
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
  plugins: [
    typescript({ inlineSources: true }),
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
  ],
  onwarn(code, defaultHandler) {
    if (code.code !== 'MIXED_EXPORTS')
      defaultHandler(code);
  }
}];

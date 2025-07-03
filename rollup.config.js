import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

module.exports = [{
  external: ['by-request', 'json-z', '@tubular/math', '@tubular/util'],
  input: 'src/index.ts',
  output: [
    {
      file: pkg.browser,
      sourcemap: true,
      format: 'umd',
      name: 'tbTime'
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
  ]
}];

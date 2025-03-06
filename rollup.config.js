import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';
import typescript from '@rollup/plugin-typescript';

export default [
  {
    input: 'dist/index.js',
    external: ['by-request', 'json-z', '@tubular/math', '@tubular/util'],
    output: [
      {
        file: 'dist/cjs/index.js',
        format: 'cjs',
        exports: 'named'
      },
      {
        file: 'dist/fesm2015/index.js',
        format: 'es'
      }
    ],
    plugins: [
      sourcemaps(),
      terser({ output: {
        comments: (node, comment) => {
          return comment.type === 'comment2' && /\b(webpackIgnore|@vite-ignore)\b/.test(comment.value);
        },
        max_line_len: 511
      } }),
      typescript()
    ]
  }
];

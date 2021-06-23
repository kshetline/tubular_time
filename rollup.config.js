import { terser } from 'rollup-plugin-terser';

export default [
  {
    input: 'dist/index.js',
    external: ['by-request', '@tubular/math', '@tubular/util'],
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
      terser({ output: { max_line_len: 511 } })
    ]
  }
];

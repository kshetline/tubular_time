const { Compilation, sources } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { resolve } = require('path');

module.exports = env => {
  const dev = !!env?.dev && (/^[ty]/i.test(env?.dev) || Number(env?.dev) !== 0);
  const libraryTarget = 'umd';

  // noinspection JSUnresolvedVariable,JSUnresolvedFunction,JSUnresolvedFunction
  return {
    mode: dev ? 'development' : 'production',
    target: ['es6', 'web'],
    entry: './dist/index.js',
    output: {
      path: resolve(__dirname, 'dist', 'umd'),
      filename: 'index.js',
      libraryTarget,
      library: 'tbTime'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /\.spec\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: [['@babel/preset-env', {
                targets: { // ES6 minimums
                  chrome:  '58',
                  edge:    '14',
                  firefox: '54',
                  opera:   '55',
                  safari:  '10'
                }
              }]]
            }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    resolve: {
      mainFields: ['fesm2015', 'module', 'main']
    },
    externals: { 'by-request': 'by-request' },
    optimization: {
      minimize: !dev,
      minimizer: [new TerserPlugin({
        terserOptions: {
          output: {
            comments: (node, comment) => {
              return comment.type === 'comment2' && /\bwebpackIgnore\b/.test(comment.value);
            },
            max_line_len: 511
          }
        }
      })],
    },
    devtool: 'source-map',
    plugins: [
      new class OutputMonitor {
        // noinspection JSUnusedGlobalSymbols
        apply(compiler) {
          compiler.hooks.thisCompilation.tap('OutputMonitor', (compilation) => {
            compilation.hooks.processAssets.tap(
              { name: 'OutputMonitor', stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
              () => {
                const file = compilation.getAsset('index.js');
                const { devtool } = compiler.options;
                let contents = file.source.source();
                const { map } = file.source.sourceAndMap();

                // Strip out dynamic import() so it doesn't generate warnings.
                contents = contents.replace(/return import\(.*?\/\* webpackIgnore: true \*\/.*?tseuqer-yb.*?\.join\(''\)\)/s, 'return null');
                // Strip out large and large-alt timezone definitions from this build.
                contents = contents.replace(/\/\* trim-file-start \*\/.*?\/\* trim-file-end \*\//sg, 'null');

                compilation.updateAsset('index.js', devtool
                  ? new sources.SourceMapSource(contents, 'index.js', map)
                  : new sources.RawSource(contents)
                );
              }
            );
          });
        }
      }()
    ]
  };
};

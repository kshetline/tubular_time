const { Compilation, sources } = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const { resolve } = require('path');

module.exports = env => {
  const umd = !!env?.umd && (/^[ty]/i.test(env?.umd) || Number(env?.umd) !== 0);
  const cjs = !umd && !!env?.cjs && (/^[ty]/i.test(env?.cjs) || Number(env?.cjs) !== 0);
  const esVersion = umd ? 'es6' : 'es2018';
  const dir = umd ? 'web' : (cjs ? 'cjs' : 'fesm2015');
  const libraryTarget = umd ? 'umd' : (cjs ? 'commonjs' : 'module');
  const asModule = !umd && !cjs;
  const outFile = `index.${asModule ? 'm' : ''}js`;

  // noinspection JSUnresolvedVariable,JSUnresolvedFunction,JSUnresolvedFunction
  return {
    mode: env?.dev ? 'development' : 'production',
    target: [esVersion, 'web'],
    entry: './dist/index.js',
    experiments: {
      outputModule: asModule
    },
    output: {
      path: resolve(__dirname, 'dist', dir),
      filename: outFile,
      libraryTarget,
      library: umd ? 'tbTime' : undefined
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
                targets: { // min ES6 : min ES2018
                  chrome:  umd ? '58' : '64',
                  edge:    umd ? '14' : '79',
                  firefox: umd ? '54' : '78',
                  opera:   umd ? '55' : '51',
                  safari:  umd ? '10' : '12',
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
      minimize: !env?.dev,
      minimizer: [new TerserPlugin({
        terserOptions: {
          output: { max_line_len: 511 }
        }
      })],
    },
    devtool: 'source-map',
    plugins: [
      new class OutputMonitor {
        // noinspection JSUnusedGlobalSymbols
        apply(compiler) {
          if (!umd)
            return;

          compiler.hooks.thisCompilation.tap('OutputMonitor', (compilation) => {
            compilation.hooks.processAssets.tap(
              { name: 'OutputMonitor', stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
              () => {
                const file = compilation.getAsset(outFile);
                const { devtool } = compiler.options;
                let contents = file.source.source();
                const { map } = file.source.sourceAndMap();

                // Strip out dynamic import() so it doesn't generate warnings.
                contents = contents.replace(/return import\(.*?\/\* webpackIgnore: true \*\/.*?tseuqer-yb.*?\.join\(''\)\)/s, 'return null');
                // Strip out large and large-alt timezone definitions from this build.
                contents = contents.replace(/\/\* trim-file-start \*\/.*?\/\* trim-file-end \*\//sg, 'null');

                compilation.updateAsset(outFile, devtool
                  ? new sources.SourceMapSource(contents, outFile, map)
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

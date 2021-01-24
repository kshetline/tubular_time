const { Compilation, sources } = require('webpack');
const { resolve } = require('path');

module.exports = env => {
  // noinspection JSUnresolvedVariable,JSUnresolvedFunction,JSUnresolvedFunction
  return {
    mode: env?.dev ? 'development' : 'production',
    target: ['es5', 'web'],
    entry: {
      index: './dist/index.js'
    },
    output: {
      path: resolve(__dirname, 'dist/web'),
      filename: `index.js`,
      libraryTarget: 'umd',
      library: 'tbTime'
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: { presets: ['@babel/preset-env'] }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    resolve: {
      mainFields: ['esm2015', 'es2015', 'module', 'main', 'browser']
    },
    externals: { 'by-request': 'by-request' },
    plugins: [
      new class OutputMonitor {
        // noinspection JSUnusedGlobalSymbols
        apply(compiler) {
          compiler.hooks.thisCompilation.tap('OutputMonitor', (compilation) => {
            compilation.hooks.processAssets.tap(
              { name: 'OutputMonitor', stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE },
              () => {
                const file = compilation.getAsset('index.js');
                let contents = file.source.source();
                // Strip out dynamic import() so it doesn't generate warnings.
                contents = contents.replace(/return import\(.*?\/\* webpackIgnore: true \*\/.*?tseuqer-yb.*?\.join\(''\)\)/s, 'return null');
                // Strip out large and large-alt timezone definitions from this build.
                contents = contents.replace(/\/\* trim-file-start \*\/.*?\/\* trim-file-end \*\//sg, 'null');
                compilation.updateAsset('index.js', new sources.RawSource(contents));
              }
            );
          });
        }
      }()
    ],
    devtool: 'source-map'
  };
};

const { Compilation, sources } = require('webpack');
const { resolve } = require('path');

module.exports = env => {
  const esVersion = env?.esver === '5' ? 'es5' : 'es6';
  const dir = env?.esver === '5' ? 'web5' : 'web';
  const chromeVersion = env?.esver === '5' ? '23' : '51';

  // noinspection JSUnresolvedVariable,JSUnresolvedFunction,JSUnresolvedFunction
  return {
    mode: env?.dev ? 'development' : 'production',
    target: [esVersion, 'web'],
    entry: {
      index: './dist/index.js'
    },
    output: {
      path: resolve(__dirname, 'dist/' + dir),
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
            options: { presets: [['@babel/preset-env', { targets: { chrome: chromeVersion } }]] }
          },
          resolve: { fullySpecified: false }
        }
      ]
    },
    resolve: {
      mainFields: ['es2015', 'browser', 'module', 'main', 'main-es5']
    },
    externals: { 'by-request': 'by-request' },
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

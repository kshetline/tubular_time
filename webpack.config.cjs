const fs = require('fs');
const { resolve } = require('path');
const JSONZ = require('json-z');
const large = JSONZ.stringify(require('./dist/es5/timezone-large').default, { quoteAllKeys: false });
const largeAlt = JSONZ.stringify(require('./dist/es5/timezone-large-alt').default, { quoteAllKeys: false });

module.exports = env => {
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
        apply(compiler) {
          compiler.hooks.afterEmit.tap('OutputMonitor', compilation => {
            if (compilation.emittedAssets.has('index.js')) {
              let contents = fs.readFileSync('./dist/web/index.js', 'utf-8');
              // Strip out dynamic import() so it doesn't generate warnings.
              contents = contents.replace(/import(?=\("tseuqer-yb")/, 'console.log');
              // Strip out large and large-alt timezone definitions from this build.
              contents = contents.replace(large, 'null');
              contents = contents.replace(largeAlt, 'null');
              fs.writeFileSync('./dist/web/index.js', contents);
            }
          });
        }
      }()
    ],
    devtool: 'source-map',
    performance: {
      // Suppress the warnings caused by the temporarily big output, before the excess data is stripped away.
      maxAssetSize: 700000,
      maxEntrypointSize: 700000
    }
  };
};

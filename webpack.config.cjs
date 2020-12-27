const { resolve } = require('path');

const cjsConfig = env => {
  return {
    mode: env?.dev ? 'development' : 'production',
    target: 'es2015',
    entry: {
      index: './dist/index.js',
      'timezone-large': './dist/timezone-large.js',
      'timezone-large-alt': './dist/timezone-large-alt.js'
    },
    output: {
      path: resolve(__dirname, 'dist/cjs'),
      filename: `[name].js`,
      libraryTarget: 'commonjs'
    },
    module: {
      rules: [
        { test: /\.js$/, use: 'babel-loader', resolve: { fullySpecified: false } }
      ]
    },
    externals: ['by-request', '@tubular/math', '@tubular/util', 'lodash', /\.\/timezone-large.*/]
  };
};

const umdConfig = env => {
  return {
    mode: env?.dev ? 'development' : 'production',
    target: 'es5',
    entry: {
      index: './dist/index.js'
    },
    output: {
      path: resolve(__dirname, 'dist/umd'),
      filename: `index.js`,
      libraryTarget: 'umd',
      library: 'tbTime'
    },
    module: {
      rules: [
        { test: /\.js$/, use: 'babel-loader', resolve: { fullySpecified: false } }
      ]
    },
    externals: ['by-request', /\.\/timezone-large.*/]
  };
};

module.exports = [cjsConfig, umdConfig];

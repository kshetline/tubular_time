const { resolve } = require('path');

module.exports = env => {
  const target = env?.target === 'umd' ? 'es5' : 'es2015';
  const libraryTarget = env?.target === 'umd' ? 'umd' : 'commonjs';
  const library = env?.target === 'umd' ? 'tbTime' : undefined;

  const config = {
    mode: env?.dev ? 'development' : 'production',
    target,
    entry: {
      index: './dist/index.js',
      'timezone-large': './dist/timezone-large.js',
      'timezone-large-alt': './dist/timezone-large-alt.js',
      'timezone-small': './dist/timezone-small.js'
    },
    output: {
      path: resolve(__dirname, 'dist'),
      filename: `[name].${env?.target || 'cjs'}.js`,
      libraryTarget,
      library
    },
    module: {
      rules: [
        { test: /\.js$/, use: 'babel-loader', resolve: { fullySpecified: false } }
      ]
    },
    externals: ['lodash']
  };

  // Allow umd target to bundle @tubular/math and @tubular/util.
  if (env?.target !== 'umd')
    config.externals.push(...['@tubular/math', '@tubular/util']);

  return config;
};

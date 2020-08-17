const path = require('path');

module.exports = {
  mode: 'development',
  entry: './main.ts',
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader', exclude: '/node_modules/' },
      { test: /phaser\.js$/, loader: 'expose-loader?Phaser' },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js']
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.js'
  },
  // devServer: {
  //   contentBase: path.resolve(__dirname, './dist'),
  //   publicPath: '/dist',
  //   host: '0.0.0.0',
  //   port: 8082,
  //   open: false
  // }

  devServer: {
    contentBase: path.resolve(__dirname, './'),
    publicPath: '/dist/',
    host: '0.0.0.0',
    port: 8082,
    watchOptions: {
      poll: 1000
    },
    open: false
  },
};
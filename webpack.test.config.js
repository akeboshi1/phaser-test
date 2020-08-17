const path = require("path");
const webpack = require("webpack");
const ConfigWebpackPlugin = require("config-webpack");
const pathToPhaser = path.join(__dirname, "/node_modules/phaser");
const phaser = path.join(pathToPhaser, "dist/phaser.js");
const tooqinguiPhaser = path.join(__dirname, "node_modules/tooqingui");
const tooqingui = path.join(tooqinguiPhaser, "dist/tooqingui.js");
const gamecorePath = path.join(__dirname, "node_modules/game-core");
const gamecore = path.join(gamecorePath, "release/js/index.js");
const CopyWebpackPlugin = require("copy-webpack-plugin");
module.exports = {
  mode: 'development',
  entry: {
    test: path.join(__dirname, './src/main.ts')
  },
  module: {
    rules: [
      { test: /\.ts$/, loader: 'ts-loader', exclude: '/node_modules/' },
      { test: /phaser\.js$/, loader: "expose-loader?Phaser" },
      { test: /tooqingui\.js$/, loader: "expose-loader?Tooqingui" },
      { test: /index\.js$/, loader: "expose-loader?GameCore" },
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js'],
    alias: {
      phaser: phaser,
      tooqingui: tooqingui,
      gamecore: gamecore
    },
  },
  plugins: [
    new CopyWebpackPlugin(
      [{ from: "./index.html", to: "", force: true }]),
    new ConfigWebpackPlugin(),
    new webpack.DefinePlugin({
      WEBGL_RENDERER: true, // I did this to make webpack work, but I'm not really sure it should always be true
      CANVAS_RENDERER: true, // I did this to make webpack work, but I'm not really sure it should always be true
    })
  ],
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'js/app.js',
    libraryTarget: "umd",
    library: "test",
  },
  devServer: {
    historyApiFallback: true,
    contentBase: path.resolve(__dirname, "./dist"),
    publicPath: "/dist",
    host: "127.0.0.1",
    port: 8082,
    open: false,
    proxy: {
      "/resources": {
        target: "http://localhost:8081/",
        // pathRewrite: { "^/resources": "" },
        changeOrigin: true
      }
    }
  },
};
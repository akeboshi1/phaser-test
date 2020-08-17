const path = require("path");
const ConfigWebpackPlugin = require("config-webpack");
const TSLintPlugin = require("tslint-webpack-plugin");
const config = {
    mode: "development",
    entry: "./src/index.ts",
    output: {
        filename: "picatown.min.js",
        path: path.join(__dirname, "dist/mod"),
        libraryTarget: "umd",
        library: "picatown-core"
    },
    resolve: {
        extensions: [".ts", ".js"]
    },
    externals: ["game-core", "tooqingui"],
    module: {
        rules: [{
            test: /\.tsx?$/,
            loader: "ts-loader"
        }]
    },
    plugins: [
        new ConfigWebpackPlugin(),
        new TSLintPlugin({
            config: path.resolve(__dirname, "./tslint.json"),
            files: ["./src/**/*.ts"],
        })
    ]
}
module.exports = (env, argv) => {
    return config;
};

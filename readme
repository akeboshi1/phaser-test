## 命令说明

|命令|描述|
|:---|:----|
|`npm install`|克隆项目后要做的事，即安装所有依赖|
|`npm start`|构建项目并在网页中打开他|
|`npm run build`|根据配置打包项目|

## 模板自定义

### Babel
支持 ES6+ 的使用并且 Babel 会把它转换为你想要被支持的版本，目标浏览器的配置在 `.babelrc` 文件中，
默认配置支持所有当前的使用率超过0.25%的浏览器，但不包括 IE11 和 Opera Mini

### Webpack
如果想要更改 build 方式，比如添加一个 webpack loader 或者 plugin，你可以修改 `webpack/base.js` 文件，或者你也可以另外修改或创建
一个配置文件，并将其作为“package.json”中特定的 npm 任务的目标

### 打包
在你运行 `npm run build` 打包项目后，你的代码将与项目依赖的任何其他 assets 一起构建到位于 `dist/bundle.min.js` 的单个包中，
如果你将 dist 文件夹的内容放在一个可公开访问的位置（比如 `http://mycoolserver.com`），你应该
就能够打开 `http://mycoolserver.com/index.html` 然后开心的玩上游戏?了
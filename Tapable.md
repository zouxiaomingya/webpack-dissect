## Tapable
> Tapable库 提供了很多的钩子类, 这些类可以为插件创建钩子
```js
const {
    SyncHook,
    SyncBailHook,
    SyncWaterfallHook,
    SyncLoopHook,
    AsyncParallelHook,
    AsyncParallelBailHook,
    AsyncSeriesHook,
    AsyncSeriesBailHook,
    AsyncSeriesWaterfallHook
 } = require("tapable");
```
### 安装
```npm
npm install --save tapable
```
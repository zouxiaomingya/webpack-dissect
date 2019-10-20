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
## 使用

所有的钩子构造函数,都接受一个可选的参数,(这个参数最好是数组,不是tapable内部也把他变成数组),这是一个参数的字符串名字列表

```
const hook = new SyncHook(["arg1", "arg2", "arg3"]);
```

最好的实践就是把所有的钩子暴露在一个类的hooks属性里面:

```javascript
class Car {
    constructor() {
        this.hooks = {
            accelerate: new SyncHook(["newSpeed"]),
            brake: new SyncHook(),
            calculateRoutes: new AsyncParallelHook(["source", "target", "routesList"])
        };
    }

    /* ... */
}
```

其他开发者现在可以这样用这些钩子

```javascript
const myCar = new Car();

// Use the tap method to add a consument
// 使用tap 方法添加一个消费者,(生产者消费者模式)
myCar.hooks.brake.tap("WarningLampPlugin", () => warningLamp.on());
```

这需要你传一个名字去标记这个插件:

你可以接收参数

```javascript
myCar.hooks.accelerate.tap("LoggerPlugin", newSpeed => console.log(`Accelerating to ${newSpeed}`));
```

在同步钩子中, tap 是唯一的绑定方法,异步钩子通常支持异步插件

```javascript
// promise: 绑定promise钩子的API
myCar.hooks.calculateRoutes.tapPromise("GoogleMapsPlugin", (source, target, routesList) => {
    // return a promise
    return google.maps.findRoute(source, target).then(route => {
        routesList.add(route);
    });
});
// tapAsync:绑定异步钩子的API
myCar.hooks.calculateRoutes.tapAsync("BingMapsPlugin", (source, target, routesList, callback) => {
    bing.findRoute(source, target, (err, route) => {
        if(err) return callback(err);
        routesList.add(route);
        // call the callback
        callback();
    });
});

// You can still use sync plugins
// tap: 绑定同步钩子的API
myCar.hooks.calculateRoutes.tap("CachedRoutesPlugin", (source, target, routesList) => {
    const cachedRoute = cache.get(source, target);
    if(cachedRoute)
        routesList.add(cachedRoute);
})
```

类需要调用被声明的那些钩子

```javascript
class Car {
    /* ... */

    setSpeed(newSpeed) {    
        // call(xx) 传参调用同步钩子的API
        this.hooks.accelerate.call(newSpeed);
    }

    useNavigationSystemPromise(source, target) {
        const routesList = new List();
        // 调用promise钩子(钩子返回一个promise)的API
        return this.hooks.calculateRoutes.promise(source, target, routesList).then(() => {
            return routesList.getRoutes();
        });
    }

    useNavigationSystemAsync(source, target, callback) {
        const routesList = new List();
        // 调用异步钩子API
        this.hooks.calculateRoutes.callAsync(source, target, routesList, err => {
            if(err) return callback(err);
            callback(null, routesList.getRoutes());
        });
    }
}
```

tapable会用最有效率的方式去编译(构建)一个运行你的插件的方法,他生成的代码依赖于一下几点:

- 你注册的插件的个数.
- 你注册插件的类型.
- 你使用的调用方法(call, promise, async) // 其实这个类型已经包括了
- 钩子参数的个数 // 就是你new xxxHook(['ooo']) 传入的参数
- 是否应用了拦截器(拦截器下面有讲)

这些确定了尽可能快的执行.

## 钩子类型

每一个钩子都可以tap 一个或者多个函数, 他们如何运行,取决于他们的钩子类型

- 基本的钩子, (钩子类名没有waterfall, Bail, 或者 Loop 的 ), 这个钩子只会简单的调用每个tap进去的函数
- Waterfall, 一个waterfall 钩子,也会调用每个tap进去的函数,不同的是,他会从每一个函数传一个返回的值到下一个函数
- Bail, Bail 钩子允许更早的退出,当任何一个tap进去的函数,返回任何值, bail类会停止执行其他的函数执行.(类似 Promise.race())
- Loop, TODO(我.... 这里也没描述,应该是写文档得时候 还没想好这个要怎么写,我尝试看他代码去补全,不过可能需要点时间.)

此外,钩子可以是同步的,也可以是异步的,Sync, AsyncSeries 和 AsyncParallel ,从名字就可以看出,哪些是可以绑定异步函数的

- Sync, 一个同步钩子只能tap同步函数, 不然会报错.
- AsyncSeries, 一个 async-series 钩子 可以tap 同步钩子, 基于回调的钩子(我估计是类似chunk的东西)和一个基于promise的钩子(使用`myHook.tap()`, `myHook.tapAsync()` 和 `myHook.tapPromise()`.).他会按顺序的调用每个方法.
- AsyncParallel, 一个 async-parallel 钩子跟上面的 async-series 一样 不同的是他会把异步钩子并行执行(并行执行就是把异步钩子全部一起开启,不按顺序执行).

## 拦截器(interception)

所有钩子都提供额外的拦截器API

```javascript
// 注册一个拦截器
myCar.hooks.calculateRoutes.intercept({
    call: (source, target, routesList) => {
        console.log("Starting to calculate routes");
    },
    register: (tapInfo) => {
        // tapInfo = { type: "promise", name: "GoogleMapsPlugin", fn: ... }
        console.log(`${tapInfo.name} is doing its job`);
        return tapInfo; // may return a new tapInfo object
    }
})
```

**call**:`(...args) => void`当你的钩子触发之前,(就是call()之前),就会触发这个函数,你可以访问钩子的参数.多个钩子执行一次

**tap**: `(tap: Tap) => void` 每个钩子执行之前(多个钩子执行多个),就会触发这个函数

**loop**:`(...args) => void` 这个会为你的每一个循环钩子(LoopHook, 就是类型到Loop的)触发,具体什么时候没说

**register**:`(tap: Tap) => Tap | undefined` 每添加一个`Tap`都会触发 你interceptor上的register,你下一个拦截器的register 函数得到的参数 取决于你上一个register返回的值,所以你最好返回一个 tap 钩子.

## Context(上下文)

插件和拦截器都可以选择加入一个可选的 context对象, 这个可以被用于传递随意的值到队列中的插件和拦截器.

```javascript
myCar.hooks.accelerate.intercept({
    context: true,
    tap: (context, tapInfo) => {
        // tapInfo = { type: "sync", name: "NoisePlugin", fn: ... }
        console.log(`${tapInfo.name} is doing it's job`);

        // `context` starts as an empty object if at least one plugin uses `context: true`.
        // 如果最少有一个插件使用 `context` 那么context 一开始是一个空的对象
        // If no plugins use `context: true`, then `context` is undefined
        // 如过tap进去的插件没有使用`context` 的 那么内部的`context` 一开始就是undefined
        if (context) {
            // Arbitrary properties can be added to `context`, which plugins can then access.    
            // 任意属性都可以添加到`context`, 插件可以访问到这些属性
            context.hasMuffler = true;
        }
    }
});

myCar.hooks.accelerate.tap({
    name: "NoisePlugin",
    context: true
}, (context, newSpeed) => {
    if (context && context.hasMuffler) {
        console.log("Silence...");
    } else {
        console.log("Vroom!");
    }
});
```

## HookMap

一个 HookMap是一个Hooks映射的帮助类

```javascript
const keyedHook = new HookMap(key => new SyncHook(["arg"]))
keyedHook.tap("some-key", "MyPlugin", (arg) => { /* ... */ });
keyedHook.tapAsync("some-key", "MyPlugin", (arg, callback) => { /* ... */ });
keyedHook.tapPromise("some-key", "MyPlugin", (arg) => { /* ... */ });
const hook = keyedHook.get("some-key");
if(hook !== undefined) {
    hook.callAsync("arg", err => { /* ... */ });
}
```

## 钩子映射接口(HookMap interface)

Public(权限公开的):

```javascript
interface Hook {
    tap: (name: string | Tap, fn: (context?, ...args) => Result) => void,
    tapAsync: (name: string | Tap, fn: (context?, ...args, callback: (err, result: Result) => void) => void) => void,
    tapPromise: (name: string | Tap, fn: (context?, ...args) => Promise<Result>) => void,
    intercept: (interceptor: HookInterceptor) => void
}

interface HookInterceptor {
    call: (context?, ...args) => void,
    loop: (context?, ...args) => void,
    tap: (context?, tap: Tap) => void,
    register: (tap: Tap) => Tap,
    context: boolean
}

interface HookMap {
    for: (key: any) => Hook,
    tap: (key: any, name: string | Tap, fn: (context?, ...args) => Result) => void,
    tapAsync: (key: any, name: string | Tap, fn: (context?, ...args, callback: (err, result: Result) => void) => void) => void,
    tapPromise: (key: any, name: string | Tap, fn: (context?, ...args) => Promise<Result>) => void,
    intercept: (interceptor: HookMapInterceptor) => void
}

interface HookMapInterceptor {
    factory: (key: any, hook: Hook) => Hook
}

interface Tap {
    name: string,
    type: string
    fn: Function,
    stage: number,
    context: boolean
}
```

Protected(保护的权限),只用于类包含的(里面的)钩子

```javascript
interface Hook {
    isUsed: () => boolean,
    call: (...args) => Result,
    promise: (...args) => Promise<Result>,
    callAsync: (...args, callback: (err, result: Result) => void) => void,
}

interface HookMap {
    get: (key: any) => Hook | undefined,
    for: (key: any) => Hook
}
```

## MultiHook

把其他的Hook 重定向(转化)成为一个 MultiHook

```javascript
const { MultiHook } = require("tapable");

this.hooks.allHooks = new MultiHook([this.hooks.hookA, this.hooks.hookB]);
```
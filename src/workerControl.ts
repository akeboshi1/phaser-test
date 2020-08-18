import TestWorker from "worker-loader?name=dist/[name].js!../TestWorker";
import { Base64, decode, encode } from "js-base64";
import "common-injector";
import { Injectable, Inject, rootInjector } from "common-injector";
// todo rpc module
export class WorkerControl {
    public worker: TestWorker;
    constructor() {
        this.worker = new TestWorker();
        const self = this;
        this.worker.onmessage = (event: any) => {
            self.onWorkerMessage(event.data);
        };
    }

    public startHandler() {
        // this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.png" });
        this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.json" });
    }

    public stopHandler() {
        this.worker.postMessage({ "method": "stop" });
    }

    public terminate() {
        this.worker.terminate();
    }
    public completeHandler(data) {
        // 由于会产生异步所以使用promise来限制回调
        const p = new Promise(function (resolve, reject) {
            const arr = [];
            arr.push(data.data);
            arr.forEach((val, index) => {
                const reader = new FileReader();
                reader.readAsDataURL(val);
                reader.onload = function (e) {
                    // tslint:disable-next-line:no-console
                    console.log(e);
                    const resList = String(e.target.result).split(",");
                    resolve(resList[1]);
                }
            })
        })

        // base64转换完成时执行，将整个res（arr2）转换为JSON字符串
        p.then(function (res) {
            const tmp = Base64.decode(String(res));
            // self.cache.json.add("logo", JSON.parse(tmp));
            // tslint:disable-next-line:no-console
            console.log(JSON.parse(tmp));
        }, function (error) {

        })

        // reader.readAsDataURL(data.data);
        const objectURL = URL.createObjectURL(data.data);
        // tslint:disable-next-line:no-console
        console.log(objectURL);
    }
    private onWorkerMessage(data: any) {
        const self = this;
        const method = data.method;
        switch (method) {
            case "completeHandler":
                // const reader = new FileReader();
                // reader.addEventListener("loadend", function () {
                // reader.result 包含被转化为类型数组 typed array 的 blob
                // tslint:disable-next-line:no-console
                //     console.log(reader.result);
                //     const url: string = String(reader.result);
                //     self.textures.on("addtexture", () => {
                //         const img = self.make.image(undefined, true);
                //         img.setTexture("logo");
                //         img.x = 100;
                //         img.y = 100;
                //     }, this);
                //     self.textures.addBase64("logo", url);
                // canvas 方式
                // document.getElementById("testImg")
                //     .setAttribute(
                //         "src", String(reader.result)
                //     );
                // });
                const arr = [];
                arr.push(data.data);

                // 由于会产生异步所以使用promise来限制回调
                const p = new Promise(function (resolve, reject) {
                    const arr2 = [];
                    arr.forEach((val, index) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(val);
                        reader.onload = function (e) {
                            // tslint:disable-next-line:no-console
                            console.log(e);
                            const resList = String(e.target.result).split(",");
                            resolve(resList[1]);
                        }
                    })
                })

                // base64转换完成时执行，将整个res（arr2）转换为JSON字符串
                p.then(function (res) {
                    const tmp = Base64.decode(String(res));
                    // self.cache.json.add("logo", JSON.parse(tmp));
                    // tslint:disable-next-line:no-console
                    console.log(JSON.parse(tmp));
                }, function (error) {

                })

                // reader.readAsDataURL(data.data);
                const objectURL = URL.createObjectURL(data.data);
                // tslint:disable-next-line:no-console
                console.log(objectURL);
                // this.load.image("logo", objectURL);
                break;
        }
    }

    // create worker
    private workers: IWorkers;
    public createWorker(name: string, url: string) {
        const worker = new Worker(url);
        this.workers[name] = worker;

        worker.addEventListener('message', this.onGetMessage);
    }
    private onGetMessage(data) {
        if (data.code != undefined && data.params != undefined) {
            this.callMainMethods(data.code, data.params);
        }
    }

    public destroyWorker(name) {
        if (!(name in this.workers)) return;

        const worker = this.workers[name];
        worker.removeEventListener("message", this.onGetMessage);
        worker.terminate();
        delete this.workers[name];
    }

    // worker => main
    private rpcMethods_main: IRPCMethods;
    // main. 
    public registerMainMethods(code: number, fn: (params: PBPacket) => void) {
        this.rpcMethods_main[code] = {
            fn: fn
        };
    }
    // worker. 
    private callMainMethods(code: number, params: PBPacket) {
        if (!(code in this.rpcMethods_main)) return;

        this.rpcMethods_main[code].fn(params);
    }

    // main => worker
    // mian. 
    public callWorkerMethods(name: string, code: number, params: PBPacket) {
        if (!(name in this.workers)) return;

        this.workers[name].postMessage({ code, params });
    }
}

interface IWorkers {
    [x: string]: Worker;
}

interface IRPCMethods {
    [x: number]: {
        fn: (params: PBPacket) => any;
    };
}
// @Injectable({ provide: WorkerControl })
// export class DemoControl {
//     public worker: TestWorker;
//     constructor() {
//         this.worker = new TestWorker();
//         const self = this;
//         this.worker.onmessage = (event: any) => {
//             self.onWorkerMessage(event.data);
//         };
//     }

//     @Inject() public startHandler() {
//         // this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.png" });
//         this.worker.postMessage({ "method": "start", "url": "https://a.tooqing.com/m/resources/ui/baseView/mainui_mobile.json" });
//     }

//     @Inject() public stopHandler() {
//         this.worker.postMessage({ "method": "stop" });
//     }

//     @Inject() public terminate() {
//         this.worker.terminate();
//     }
//     @Inject() public completeHandler(data) {
//         // 由于会产生异步所以使用promise来限制回调
//         const p = new Promise(function (resolve, reject) {
//             const arr = [];
//             arr.push(data.data);
//             arr.forEach((val, index) => {
//                 const reader = new FileReader();
//                 reader.readAsDataURL(val);
//                 reader.onload = function (e) {
//                     // tslint:disable-next-line:no-console
//                     console.log(e);
//                     const resList = String(e.target.result).split(",");
//                     resolve(resList[1]);
//                 }
//             })
//         })

//         // base64转换完成时执行，将整个res（arr2）转换为JSON字符串
//         p.then(function (res) {
//             const tmp = Base64.decode(String(res));
//             // self.cache.json.add("logo", JSON.parse(tmp));
//             // tslint:disable-next-line:no-console
//             console.log(JSON.parse(tmp));
//         }, function (error) {

//         })

//         // reader.readAsDataURL(data.data);
//         const objectURL = URL.createObjectURL(data.data);
//         // tslint:disable-next-line:no-console
//         console.log(objectURL);
//     }
//     private onWorkerMessage(data: any) {
//         const self = this;
//         const method = data.method;
//         this.[method].apply(data.data);
//         switch (method) {
//             case "completeHandler":
//                 // const reader = new FileReader();
//                 // reader.addEventListener("loadend", function () {
//                 // reader.result 包含被转化为类型数组 typed array 的 blob
//                 // tslint:disable-next-line:no-console
//                 //     console.log(reader.result);
//                 //     const url: string = String(reader.result);
//                 //     self.textures.on("addtexture", () => {
//                 //         const img = self.make.image(undefined, true);
//                 //         img.setTexture("logo");
//                 //         img.x = 100;
//                 //         img.y = 100;
//                 //     }, this);
//                 //     self.textures.addBase64("logo", url);
//                 // canvas 方式
//                 // document.getElementById("testImg")
//                 //     .setAttribute(
//                 //         "src", String(reader.result)
//                 //     );
//                 // });
//                 const arr = [];
//                 arr.push(data.data);

//                 // 由于会产生异步所以使用promise来限制回调
//                 const p = new Promise(function (resolve, reject) {
//                     const arr2 = [];
//                     arr.forEach((val, index) => {
//                         const reader = new FileReader();
//                         reader.readAsDataURL(val);
//                         reader.onload = function (e) {
//                             // tslint:disable-next-line:no-console
//                             console.log(e);
//                             const resList = String(e.target.result).split(",");
//                             resolve(resList[1]);
//                         }
//                     })
//                 })

//                 // base64转换完成时执行，将整个res（arr2）转换为JSON字符串
//                 p.then(function (res) {
//                     const tmp = Base64.decode(String(res));
//                     // self.cache.json.add("logo", JSON.parse(tmp));
//                     // tslint:disable-next-line:no-console
//                     console.log(JSON.parse(tmp));
//                 }, function (error) {

//                 })

//                 // reader.readAsDataURL(data.data);
//                 const objectURL = URL.createObjectURL(data.data);
//                 // tslint:disable-next-line:no-console
//                 console.log(objectURL);
//                 // this.load.image("logo", objectURL);
//                 break;
//         }
//     }
// }
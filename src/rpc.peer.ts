import { webworker_rpc } from "pixelpai_proto";
import { RPCMessage, RPCExecutor, RPCExecutePacket, RPCParam, RPCRegistryPacket } from "./rpc.message";
// import { Logger } from "../../src/utils/log";

export const MESSAGEKEY_INIT: string = "init";
export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_GOTREGISTRY: string = "gotRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

// 各个worker之间通信桥梁
export class RPCPeer {
    ["remote"]: {
        [worker: string]: {
            [context: string]: {
                [method: string]: (callback?: webworker_rpc.Executor, ...args) => {}
            }
        };
    };// 解决编译时execute报错，并添加提示

    public name: string;

    private worker: Worker;
    private registry: Map<string, webworker_rpc.IExecutor[]>;
    private channels: Map<string, MessagePort>;
    private linkListeners: Map<string, LinkListener>;

    constructor(name: string, w?: Worker) {
        if (!name) {
            // Logger.getInstance().error("param <name> error");
            return;
        }

        this.name = name;
        this.worker = w;
        this.registry = new Map();
        this.channels = new Map();
        this.linkListeners = new Map();

        if (w) {
            w.onmessage = (ev: MessageEvent) => {
                const { key } = ev.data;
                if (key === MESSAGEKEY_INIT) {
                    const { workers } = ev.data;
                    const ports = ev.ports;
                    for (let i = 0; i < ports.length; i++) {
                        const onePort = ports[i];
                        const oneWorker = workers[i];
                        this.addLink(oneWorker, onePort);
                    }
                }
            };
        }
        // works in Chrome 18 but not Firefox 10 or 11
        // if (!ArrayBuffer.prototype.slice)
        //     ArrayBuffer.prototype.slice = function (start, end) {
        //         const that = new Uint8Array(this);
        //         if (!end) end = that.length;
        //         const result = new ArrayBuffer(end - start);
        //         const resultArray = new Uint8Array(result);
        //         for (let i = 0; i < resultArray.length; i++)
        //             resultArray[i] = that[i + start];
        //         return result;
        //     }
    }

    public linkToUrl(workerName: string, workerUrl: string): LinkListener {
        // TODO: 添加重复创建判定

        const worker = new Worker(workerUrl);
        return this.linkToWorker(workerName, worker);
    }
    public linkToWorker(workerName: string, worker: any): LinkListener {
        // console.log(this.name + " linkToWorker", workerName);
        const listener = new LinkListener(this.name, workerName);
        this.linkListeners.set(workerName, listener);

        const channel = new MessageChannel();

        worker.postMessage({ key: MESSAGEKEY_INIT, workers: [this.name] }, [channel.port2]);
        this.addLink(workerName, channel.port1);

        return listener;
    }

    // 增加worker之间的通道联系
    private addLink(worker: string, port: MessagePort) {
        if (this.channels.has(worker)) {
            return;
        }
        this.channels.set(worker, port);
        // console.log(this.name + " addLink: ", worker);
        port.onmessage = (ev: MessageEvent) => {
            const { key } = ev.data;
            if (!key) {
                // Logger.getInstance().warn("<key> not in ev.data");
                return;
            }
            switch (key) {
                case MESSAGEKEY_ADDREGISTRY:
                    this.onMessage_AddRegistry(ev);
                    break;
                case MESSAGEKEY_GOTREGISTRY:
                    this.onMessage_GotRegistry(ev);
                    break;
                case MESSAGEKEY_RUNMETHOD:
                    this.onMessage_RunMethod(ev);
                    break;
                default:
                    // Logger.getInstance().warn("got message outof control: ", ev.data);
                    break;
            }
        };
        // post registry
        this.postRegistry(worker, new RPCRegistryPacket(this.name, RPCFunctions));
    }

    // worker调用其他worker方法
    private execute(worker: string, packet: RPCExecutePacket) {
        // Logger.getInstance().log(this.name + " execute: ", worker, packet);
        if (!this.registry.has(worker)) {
            // Logger.getInstance().error("worker <" + worker + "> not registed");
            return;
        }
        const executor = this.registry.get(worker).find((x) => x.context === packet.header.remoteExecutor.context &&
            x.method === packet.header.remoteExecutor.method);
        if (!executor) {
            // Logger.getInstance().error("method <" + packet.header.remoteExecutor.method + "> not registed");
            return;
        }

        const regParams = executor.params;
        const remoteParams = packet.header.remoteExecutor.params;
        if (regParams && regParams.length > 0) {
            if (!remoteParams || remoteParams.length === 0) {
                // Logger.getInstance().error("execute param error! ", "param.length = 0");
                return;
            }

            if (regParams.length > remoteParams.length) {
                // Logger.getInstance().error("execute param error! ", "param not enough");
                return;
            }

            for (let i = 0; i < regParams.length; i++) {
                const regP = regParams[i];
                const remoteP = remoteParams[i];
                if (regP.t !== remoteP.t) {
                    // Logger.getInstance().error("execute param error! ", "type not match, registry: <", regP.t, ">; execute: <", remoteP.t, ">");
                    return;
                }
            }
        }

        const messageData = new RPCMessage(MESSAGEKEY_RUNMETHOD, packet);
        const buf = webworker_rpc.WebWorkerMessage.encode(messageData).finish().buffer;
        if (this.channels.has(worker)) {
            this.channels.get(worker).postMessage(messageData, [].concat(buf.slice(0)));
        }
    }
    // 通知其他worker添加回调注册表
    private postRegistry(worker: string, registry: RPCRegistryPacket) {
        // Logger.getInstance().log(this.name + " postRegistry: ", worker, registry);

        const messageData = new RPCMessage(MESSAGEKEY_ADDREGISTRY, registry);
        const buf = webworker_rpc.WebWorkerMessage.encode(messageData).finish().buffer;
        if (this.channels.has(worker)) {
            const port = this.channels.get(worker);
            port.postMessage(messageData, [].concat(buf.slice(0)));
        }
    }
    private onMessage_AddRegistry(ev: MessageEvent) {
        // console.log(this.name + " onMessage_AddRegistry:", ev.data);
        const { dataRegistry } = ev.data;
        if (!dataRegistry) {
            // Logger.getInstance().warn("<data> not in ev.data");
            return;
        }
        if (!RPCRegistryPacket.checkType(dataRegistry)) {
            // Logger.getInstance().warn("<data> type error: ", dataRegistry);
            return;
        }
        const packet: RPCRegistryPacket = dataRegistry as RPCRegistryPacket;
        this.registry.set(packet.serviceName, packet.executors);
        this.addRegistryProperty(packet);

        if (this.channels.has(packet.serviceName)) {
            const port = this.channels.get(packet.serviceName);
            port.postMessage({ key: MESSAGEKEY_GOTREGISTRY, worker: this.name });
        }
        if (this.linkListeners.has(packet.serviceName)) {
            this.linkListeners.get(packet.serviceName).setPortReady(this.name);
        }
    }
    private onMessage_GotRegistry(ev: MessageEvent) {
        // console.log(this.name + " onMessage_GotRegistry:", ev.data);
        const { worker } = ev.data;
        if (this.linkListeners.has(worker)) {
            this.linkListeners.get(worker).setPortReady(worker);
        }
    }
    private onMessage_RunMethod(ev: MessageEvent) {
        // console.log(this.name + " onMessage_RunMethod:", ev.data);
        const { dataExecute } = ev.data;
        if (!dataExecute) {
            // Logger.getInstance().warn("<data> not in ev.data");
            return;
        }
        if (!RPCExecutePacket.checkType(dataExecute)) {
            // Logger.getInstance().warn("<data> type error: ", dataExecute);
            return;
        }
        const packet: RPCExecutePacket = dataExecute as RPCExecutePacket;

        const remoteExecutor = packet.header.remoteExecutor;

        const params = [];
        if (remoteExecutor.params) {
            for (const param of remoteExecutor.params) {
                switch (param.t) {
                    case webworker_rpc.ParamType.boolean:
                        {
                            params.push(param.valBool);
                        }
                        break;
                    case webworker_rpc.ParamType.num:
                        {
                            params.push(param.valNum);
                        }
                        break;
                    case webworker_rpc.ParamType.str:
                        {
                            params.push(param.valStr);
                        }
                        break;
                    case webworker_rpc.ParamType.unit8array:
                        {
                            params.push(param.valBytes);
                        }
                        break;
                    default:
                        break;
                }
            }
        }
        const result = this.executeFunctionByName(remoteExecutor.method, remoteExecutor.context, params);
        if (result && result instanceof Promise) {
            // tslint:disable-next-line:no-shadowed-variable
            result.then((...args) => {
                const callbackParams: webworker_rpc.Param[] = [];
                for (const arg of args) {
                    const t = RPCParam.typeOf(arg);
                    if (t !== webworker_rpc.ParamType.UNKNOWN) {
                        callbackParams.push(new RPCParam(t, arg));
                    }
                }

                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    if (callback.params) {
                        if (callbackParams.length < callback.params.length) {
                            // Logger.getInstance().error(`not enough data from promise`);
                            return;
                        }
                        for (let i = 0; i < callback.params.length; i++) {
                            const p = callback.params[i];
                            const cp = callbackParams[i];
                            if (p.t !== cp.t) {
                                // Logger.getInstance().error(`param type not match: <${p.t}> <${cp.t}>`);
                                return;
                            }
                        }
                        this.execute(packet.header.serviceName, new RPCExecutePacket(this.name, callback.method, callback.context, callbackParams));
                    } else {
                        this.execute(packet.header.serviceName, new RPCExecutePacket(this.name, callback.method, callback.context));
                    }
                }
            });
        }
    }

    private executeFunctionByName(functionName: string, context: string, args?: any[]) {
        if (!RPCContexts.has(context)) {
            // Logger.getInstance().error("no context exit: ", context);
            return null;
        }

        const con = RPCContexts.get(context);
        return con[functionName].apply(con, args);
    }

    private addRegistryProperty(packet: RPCRegistryPacket) {
        const service = packet.serviceName;
        const executors = packet.executors;
        const serviceProp = {};
        for (const executor of executors) {
            if (!(executor.context in serviceProp)) {
                addProperty(serviceProp, executor.context, {});
            }

            addProperty(serviceProp[executor.context], executor.method, (callback?: webworker_rpc.Executor, ...args) => {
                const params: RPCParam[] = [];
                if (args) {
                    for (const arg of args) {
                        const t = RPCParam.typeOf(arg);
                        if (t === webworker_rpc.ParamType.UNKNOWN) {
                            // Logger.getInstance().warn("unknown param type: ", arg);
                            continue;
                        }
                        params.push(new RPCParam(t, arg));
                    }
                }
                if (callback) {
                    this.execute(service, new RPCExecutePacket(this.name, executor.method, executor.context, params, callback));
                } else {
                    this.execute(service, new RPCExecutePacket(this.name, executor.method, executor.context, params));
                }
            });
        }

        if (!this.remote) this.remote = {};

        addProperty(this.remote, service, serviceProp);

        // Logger.getInstance().log(this.name + "addRegistryProperty", this);
    }
}

class LinkListener {
    private readyFunc: () => any;
    private port1: string = "";
    private port2: string = "";
    private port1Ready: boolean = false;
    private port2Ready: boolean = false;

    constructor(port1: string, port2: string) {
        this.port1 = port1;
        this.port2 = port2;
    }

    public onReady(f: () => any) {
        this.readyFunc = f;
    }

    public setPortReady(port: string) {
        if (this.port1 !== port && this.port2 !== port) return;

        if (!this.port1Ready) this.port1Ready = this.port1 === port;
        if (!this.port2Ready) this.port2Ready = this.port2 === port;

        if (this.port1Ready && this.port2Ready) {
            if (this.readyFunc) {
                this.readyFunc();
            }
        }
    }
}

const RPCFunctions: RPCExecutor[] = [];
const RPCContexts: Map<string, any> = new Map();

// decorater
export function RPCFunction(paramTypes?: webworker_rpc.ParamType[]) {
    return (target, name, descriptor) => {
        const context = target.constructor.name;
        if (!RPCContexts.has(context)) RPCContexts.set(context, target);

        const params: RPCParam[] = [];
        if (paramTypes) {
            for (const pt of paramTypes) {
                params.push(new RPCParam(pt));
            }
        }
        if (params.length > 0) {
            RPCFunctions.push(new RPCExecutor(name, context, params));
        } else {
            RPCFunctions.push(new RPCExecutor(name, context));
        }
    };
}

function addProperty(obj: any, key: string, val: any) {
    if (key in obj) {
        // Logger.getInstance().error("key exits, add property failed!", obj, key);
        return obj;
    }
    obj[key] = val;
    return obj;
}

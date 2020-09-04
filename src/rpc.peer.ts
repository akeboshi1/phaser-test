import { webworker_rpc } from "pixelpai_proto";
import { RPCMessage, RPCExecutor, RPCExecutePacket, RPCParam, RPCRegistryPacket } from "./rpc.message";

export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

// 各个worker之间通信桥梁
export class RPCPeer {
    [x: string]: any;// 解决编译时execute报错
    public name: string;

    private worker: Worker;
    private registry: Map<string, webworker_rpc.IExecutor[]>;
    private channels: Map<string, MessagePort>;

    constructor(name: string, w: Worker) {
        if (!w) {
            // tslint:disable-next-line:no-console
            console.error("param <worker> error");
            return;
        }
        if (!name) {
            // tslint:disable-next-line:no-console
            console.error("param <name> error");
            return;
        }

        this.name = name;
        this.worker = w;
        this.registry = new Map();
        this.channels = new Map();

        // works in Chrome 18 but not Firefox 10 or 11
        if (!ArrayBuffer.prototype.slice)
            ArrayBuffer.prototype.slice = function (start, end) {
                const that = new Uint8Array(this);
                if (end === undefined) end = that.length;
                const result = new ArrayBuffer(end - start);
                const resultArray = new Uint8Array(result);
                for (let i = 0; i < resultArray.length; i++)
                    resultArray[i] = that[i + start];
                return result;
            }
    }
    // worker调用其他worker方法
    public execute(worker: string, packet: RPCExecutePacket) {
        // tslint:disable-next-line:no-console
        console.log(this.name + " execute: ", worker, packet);
        if (!this.registry.has(worker)) {
            // tslint:disable-next-line:no-console
            console.error("worker <" + worker + "> not registed");
            return;
        }
        const executor = this.registry.get(worker).find((x) => x.context === packet.header.remoteExecutor.context &&
            x.method === packet.header.remoteExecutor.method);
        if (executor === null) {
            // tslint:disable-next-line:no-console
            console.error("method <" + packet.header.remoteExecutor.method + "> not registed");
            return;
        }

        const regParams = executor.params;
        const remoteParams = packet.header.remoteExecutor.params;
        if (regParams && regParams.length > 0) {
            if (!remoteParams || remoteParams.length === 0) {
                console.error("execute param error! ", "param.length = 0");
                return;
            }

            if (regParams.length > remoteParams.length) {
                console.error("execute param error! ", "param not enough");
                return;
            }

            for (let i = 0; i < regParams.length; i++) {
                const regP = regParams[i];
                const remoteP = remoteParams[i];
                if (regP.t !== remoteP.t) {
                    console.error("execute param error! ", "type not match, registry: <", regP.t, ">; execute: <", remoteP.t, ">");
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
    // 增加worker之间的通道联系
    public addLink(worker: string, port: MessagePort) {
        this.channels.set(worker, port);
        // tslint:disable-next-line:no-console
        console.log(this.name + " addLink:", worker);
        port.onmessage = (ev: MessageEvent) => {
            const { key } = ev.data;
            if (!key) {
                // tslint:disable-next-line:no-console
                console.warn("<key> not in ev.data");
                return;
            }
            switch (key) {
                case MESSAGEKEY_ADDREGISTRY:
                    this.onMessage_AddRegistry(ev);
                    break;
                case MESSAGEKEY_RUNMETHOD:
                    this.onMessage_RunMethod(ev);
                    break;

                default:
                    // tslint:disable-next-line:no-console
                    console.warn("got message outof control: ", ev.data);
                    break;
            }
        }

        // post registry
        this.postRegistry(worker, new RPCRegistryPacket(this.name, RPCFunctions));
    }
    // 返回是否所有已连接worker准备完毕（可调用execute）。注意：未连接的worker不会包含在内
    public isAllChannelReady(): boolean {
        for (const w of Array.from(this.channels.keys())) {
            if (!this.isChannelReady(w)) return false;
        }
        return true;
    }
    // 返回单个worker是否准备完毕（可调用execute）
    public isChannelReady(worker: string): boolean {
        return this.registry.has(worker);
    }

    // 通知其他worker添加回调注册表
    private postRegistry(worker: string, registry: RPCRegistryPacket) {
        // tslint:disable-next-line:no-console
        console.log(this.name + " postRegistry: ", worker, registry);

        const messageData = new RPCMessage(MESSAGEKEY_ADDREGISTRY, registry);
        const buf = webworker_rpc.WebWorkerMessage.encode(messageData).finish().buffer;
        if (this.channels.has(worker)) {
            const port = this.channels.get(worker);
            port.postMessage(messageData, [].concat(buf.slice(0)));
        }
    }
    private onMessage_AddRegistry(ev: MessageEvent) {
        // tslint:disable-next-line:no-console
        console.log(this.name + " onMessage_AddRegistry:", ev.data);
        const { dataRegistry } = ev.data;
        if (!dataRegistry) {
            // tslint:disable-next-line:no-console
            console.warn("<data> not in ev.data");
            return;
        }
        if (!RPCRegistryPacket.checkType(dataRegistry)) {
            // tslint:disable-next-line:no-console
            console.warn("<data> type error: ", dataRegistry);
            return;
        }
        const packet: RPCRegistryPacket = dataRegistry as RPCRegistryPacket;
        this.registry.set(packet.serviceName, packet.executors);
        this.addRegistryProperty(packet);
    }
    private onMessage_RunMethod(ev: MessageEvent) {
        // tslint:disable-next-line:no-console
        console.log(this.name + " onMessage_RunMethod:", ev.data);
        const { dataExecute } = ev.data;
        if (!dataExecute) {
            // tslint:disable-next-line:no-console
            console.warn("<data> not in ev.data");
            return;
        }
        if (!RPCExecutePacket.checkType(dataExecute)) {
            // tslint:disable-next-line:no-console
            console.warn("<data> type error: ", dataExecute);
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
        if (result !== null && result instanceof Promise) {
            // tslint:disable-next-line:no-shadowed-variable
            result.then((...args) => {
                let callbackParams: webworker_rpc.Param[] = [];
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
                            // tslint:disable-next-line:no-console
                            console.error(`not enough data from promise`);
                            return;
                        }
                        for (let i = 0; i < callback.params.length; i++) {
                            const p = callback.params[i];
                            const cp = callbackParams[i];
                            if (p.t !== cp.t) {
                                // tslint:disable-next-line:no-console
                                console.error(`param type not match: <${p.t}> <${cp.t}>`);
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
        if (!RPCContexts.has(context)) return null;

        const con = RPCContexts.get(context);
        return con[functionName].apply(con, args);
    }

    private addRegistryProperty(packet: RPCRegistryPacket) {
        const service = packet.serviceName;
        const executors = packet.executors;
        let serviceProp = {};
        for (const executor of executors) {
            if (!(executor.context in serviceProp)) {
                addProperty(serviceProp, executor.context, {});
            }

            addProperty(serviceProp[executor.context], executor.method, (...args) => {
                const params: RPCParam[] = [];
                let callback: webworker_rpc.Executor = null;
                for (const arg of args) {
                    if (arg instanceof webworker_rpc.Executor) {
                        callback = arg;
                        continue;
                    }
                    const t = RPCParam.typeOf(arg);
                    if (t === webworker_rpc.ParamType.UNKNOWN) {
                        console.warn("unknown param type: ", arg);
                        continue;
                    }
                    params.push(new RPCParam(t, arg));
                }
                if (callback) {
                    this.execute(service, new RPCExecutePacket(this.name, executor.method, executor.context, params, callback));
                } else {
                    this.execute(service, new RPCExecutePacket(this.name, executor.method, executor.context, params));
                }
            });
        }
        addProperty(this, service, serviceProp);

        // tslint:disable-next-line:no-console
        console.log("addRegistryProperty", this);
    }
}

let RPCFunctions: RPCExecutor[] = [];
let RPCContexts: Map<string, any> = new Map();

// decorater
export function RPCFunction(paramTypes?: webworker_rpc.ParamType[]) {
    return function (target, name, descriptor) {
        const context = target.constructor.name;
        if (!RPCContexts.has(context)) RPCContexts.set(context, target);

        let params: RPCParam[] = [];
        if (paramTypes !== undefined && paramTypes !== null) {
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
        // tslint:disable-next-line:no-console
        console.error("key exits, add property failed!", obj, key);
        return obj;
    }
    obj[key] = val;
    return obj;
}
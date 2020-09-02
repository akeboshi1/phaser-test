import { webworker_rpc } from "pixelpai_proto";
import { RPCMessage, RPCExecutor, RPCExecutePacket, RPCParam, RPCRegistryPacket } from "./rpc.message";

export const MESSAGEKEY_LINK: string = "link";
export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

// 各个worker之间通信桥梁
export class RPCPeer {
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

        this.worker.addEventListener("message", (ev: MessageEvent) => {
            const { key } = ev.data;
            if (!key) {
                // tslint:disable-next-line:no-console
                console.warn("<key> not in ev.data");
                return;
            }

            // tslint:disable-next-line:no-console
            console.log(this.name + " peer on message:", ev.data);
            switch (key) {
                case MESSAGEKEY_LINK:
                    this.onMessage_Link(ev);
                    break;

                default:
                    // tslint:disable-next-line:no-console
                    console.warn("got message outof control: ", ev.data);
                    break;
            }
        });

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
        console.log(this.name + " callMethod: ", worker, packet);
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
    private onMessage_Link(ev: MessageEvent) {
        const { data } = ev.data;
        if (!data) {
            // tslint:disable-next-line:no-console
            console.warn("<data> not in ev.data");
            return;
        }
        const port = ev.ports[0];
        this.addLink(data, port);
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
            result.then((data) => {
                let callbackParams: webworker_rpc.Param[] = null;
                if (data !== undefined && data !== null) {
                    if (!Array.isArray(data)) {
                        // tslint:disable-next-line:no-console
                        console.error(`${data} is not type of array`);
                        return;
                    }
                    if (data.length > 0) {
                        for (const p of data) {
                            if (!RPCParam.checkType(p)) {
                                // tslint:disable-next-line:no-console
                                console.error(`${p} is not type of RPCParam`);
                                return;
                            }
                        }
                    }
                    callbackParams = data as webworker_rpc.Param[];
                }

                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    if (callback.params) {
                        if (!callbackParams) {
                            // tslint:disable-next-line:no-console
                            console.error(`no data from promise`);
                            return;
                        }
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
        // // const args = Array.prototype.slice.call(arguments, 2);
        // const namespaces = functionName.split(".");
        // const func = namespaces.pop();
        // for (const i = 0; i < namespaces.length; i++) {
        //     context = context[namespaces[i]];
        // }
        // return context[func].apply(context, args);

        if (!RPCContexts.has(context)) return null;

        const con = RPCContexts.get(context);
        return con[functionName].apply(con, args);
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
        console.log("decorater: ", RPCFunctions, RPCContexts);
    };
}
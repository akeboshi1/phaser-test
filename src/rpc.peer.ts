import { webworker_rpc } from "pixelpai_proto";
import { RPCMessage, RPCExecutor, RPCExecutePacket } from "./rpc.message";

export const MESSAGEKEY_LINK: string = "link";
export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

// 各个worker之间通信桥梁
export class RPCPeer {
    public name: string;
    private worker: Worker;
    private registry: RPCExecutor[];
    private channels: Map<string, MessagePort>;
    private contexts: Map<string, any>;

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
        this.registry = [];
        this.channels = new Map();
        this.contexts = new Map();

        this.worker.addEventListener("message", (ev: MessageEvent) => {
            const { key } = ev.data;
            if (!key) {
                // tslint:disable-next-line:no-console
                console.warn("<key> not in ev.data");
                return;
            }

            // tslint:disable-next-line:no-console
            console.log("peer on message:", ev.data);
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
    // worker之间注册方法，并通知其他worker更新回调注册表
    public registerExecutor(context: any, executor: RPCExecutor) {
        // tslint:disable-next-line:no-console
        console.log("registerMethod: ", this);

        this.registry.push(executor);
        if (this.contexts.has(executor.context) && this.contexts.get(executor.context) !== context) {
            // tslint:disable-next-line:no-console
            console.warn("<" + executor.context + "> changed");
        }
        this.contexts.set(executor.context, context);

        // const messageData = { "key": MESSAGEKEY_ADDREGISTRY, "data": executor };
        const messageData = new RPCMessage(MESSAGEKEY_ADDREGISTRY, executor);
        const buf = webworker_rpc.WebWorkerMessage.encode(messageData).finish().buffer;
        // tslint:disable-next-line:no-console
        // console.log("postMessage: ", MESSAGEKEY_ADDREGISTRY, messageData, buf);
        const ports = Array.from(this.channels.values());
        for (const port of ports) {
            // tslint:disable-next-line:no-console
            console.log("buffer:::" + [].concat(buf.slice(0)));
            port.postMessage(messageData, [].concat(buf.slice(0)));
        }
    }
    // worker调用其他worker方法
    public execute(worker: string, packet: RPCExecutePacket) {
        // tslint:disable-next-line:no-console
        console.log("callMethod: ", this);
        const executor = this.registry.find((x) => x.context === packet.header.remoteExecutor.context &&
            x.method === packet.header.remoteExecutor.method);
        if (executor === null) {
            // tslint:disable-next-line:no-console
            console.error("method <" + packet.header.remoteExecutor.method + "> not register");
            return;
        }

        // const messageData = { "key": MESSAGEKEY_RUNMETHOD, "data": packet };
        const messageData = new RPCMessage(MESSAGEKEY_RUNMETHOD, packet);
        const buf = webworker_rpc.WebWorkerMessage.encode(messageData).finish().buffer;
        // tslint:disable-next-line:no-console
        // console.log("postMessage: ", MESSAGEKEY_RUNMETHOD, messageData, buf);
        if (this.channels.has(worker)) {
            // tslint:disable-next-line:no-console
            console.log("buffer:::" + [].concat(buf.slice(0)));
            this.channels.get(worker).postMessage(messageData, [].concat(buf.slice(0)));
        }
    }
    // 增加worker之间的通道联系
    public addLink(worker: string, port: MessagePort) {
        this.channels.set(worker, port);
        // tslint:disable-next-line:no-console
        console.log("onMessage_Link:", this.channels);
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
        console.log("onMessage_AddRegistry:", ev.data);
        const { dataExecutor } = ev.data;
        if (!dataExecutor) {
            // tslint:disable-next-line:no-console
            console.warn("<data> not in ev.data");
            return;
        }
        if (!RPCExecutor.checkType(dataExecutor)) {
            // tslint:disable-next-line:no-console
            console.warn("<data> type error: ", dataExecutor);
            return;
        }
        this.registry.push(dataExecutor as RPCExecutor);
    }
    private onMessage_RunMethod(ev: MessageEvent) {
        // tslint:disable-next-line:no-console
        console.log("onMessage_RunMethod:", ev.data);
        const { dataPackage } = ev.data;
        if (!dataPackage) {
            // tslint:disable-next-line:no-console
            console.warn("<data> not in ev.data");
            return;
        }
        if (!RPCExecutePacket.checkType(dataPackage)) {
            // tslint:disable-next-line:no-console
            console.warn("<data> type error: ", dataPackage);
            return;
        }
        const packet: RPCExecutePacket = dataPackage as RPCExecutePacket;

        const remoteExecutor = packet.header.remoteExecutor;

        // TODO: check param

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
                    case webworker_rpc.ParamType.arrayBuffer:
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
            result.then((params) => {
                // if (e instanceof webworker_rpc.Param[]) return; // TODO

                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    const callbackParams = params as webworker_rpc.Param[];
                    // check param type
                    // for (const p of callback.params) {

                    // }
                    this.execute(packet.header.serviceName, new RPCExecutePacket(this.name, callback.method, callback.context, callbackParams));
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

        if (!this.contexts.has(context)) return null;

        const con = this.contexts.get(context);
        return con[functionName].apply(con, args);
    }
}
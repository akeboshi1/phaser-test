import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./rpc.executor";
import { RPCWebWorkerPacket } from "./rpc.webworkerpacket";

export const MESSAGEKEY_LINK: string = "link";
export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

export class RPCPeer {
    public name: string;
    private worker: Worker;
    private registry: RPCExecutor[];
    private channels: Map<string, MessagePort>;
    private contexts: Map<string, any>;

    constructor(name: string, w: Worker) {
        if (!w) {
            console.error("param <worker> error");
            return;
        }
        if (!name) {
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
                console.warn("<key> not in ev.data");
                return;
            }

            console.log("peer on message:", ev.data);
            switch (key) {
                case MESSAGEKEY_LINK:
                    this.onMessage_Link(ev);
                    break;

                default:
                    console.warn("got message outof control: ", ev.data);
                    break;
            }
        });
    }

    public registerExecutor(context: any, executor: RPCExecutor) {
        console.log("registerMethod: ", this);

        this.registry.push(executor);
        this.contexts.set(executor.context, context);

        this.channels.forEach((port) => {
            port.postMessage({ "key": MESSAGEKEY_ADDREGISTRY, "data": executor });// TODO:transterable
        });
    }

    public execute(worker: string, packet: RPCWebWorkerPacket) {
        console.log("callMethod: ", this);
        const executor = this.registry.find((x) => x.context === packet.header.remoteExecutor.context &&
            x.method === packet.header.remoteExecutor.method);
        if (executor === null) {
            console.error("method <" + packet.header.remoteExecutor.method + "> not register");
            return;
        }

        if (this.channels.has(worker))
            this.channels.get(worker).postMessage({ "key": MESSAGEKEY_RUNMETHOD, "data": packet });// TODO:transterable
    }

    public addLink(worker: string, port: MessagePort) {
        this.channels.set(worker, port);
        console.log("onMessage_Link:", this.channels);
        port.onmessage = (ev: MessageEvent) => {
            const { key } = ev.data;
            if (!key) {
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
                    console.warn("got message outof control: ", ev.data);
                    break;
            }
        }
    }

    private onMessage_Link(ev: MessageEvent) {
        const { data } = ev.data;
        if (!data) {
            console.warn("<data> not in ev.data");
            return;
        }
        const port = ev.ports[0];
        this.addLink(data, port);
    }
    private onMessage_AddRegistry(ev: MessageEvent) {
        console.log("onMessage_AddRegistry:", ev.data);
        const { data } = ev.data;
        if (!data) {
            console.warn("<data> not in ev.data");
            return;
        }
        // if (!(data instanceof RPCExecutor)) {
        //     console.warn("<data> type error: ", data);
        //     return;
        // }
        this.registry.push(data as RPCExecutor);
    }
    private onMessage_RunMethod(ev: MessageEvent) {
        console.log("onMessage_RunMethod:", ev.data);
        const { data } = ev.data;
        if (!data) {
            console.warn("<data> not in ev.data");
            return;
        }
        // if (!(data instanceof RPCWebWorkerPacket)) {
        //     console.warn("<data> type error: ", data);
        //     return;
        // }
        const packet: RPCWebWorkerPacket = data as RPCWebWorkerPacket;

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
                    default:
                        break;
                }
            }
        }
        const result = this.executeFunctionByName(remoteExecutor.method, remoteExecutor.context, params);
        if (result !== null && result instanceof Promise) {
            result.then((params) => {
                // if (e instanceof webworker_rpc.Param[]) return; // TODO

                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    const callbackParams = params as webworker_rpc.Param[];
                    // check param type
                    // for (const p of callback.params) {

                    // }
                    this.execute(packet.header.serviceName, new RPCWebWorkerPacket(this.name, callback.method, callback.context, callbackParams));
                }
            });
        }
    }

    private executeFunctionByName(functionName: string, context: string, args?: any[]) {
        // // const args = Array.prototype.slice.call(arguments, 2);
        // const namespaces = functionName.split(".");
        // var func = namespaces.pop();
        // for (var i = 0; i < namespaces.length; i++) {
        //     context = context[namespaces[i]];
        // }
        // return context[func].apply(context, args);

        if (!this.contexts.has(context)) return null;

        const con = this.contexts.get(context);
        return con[functionName].apply(con, args);
    }
}
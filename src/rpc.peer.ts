import { webworker_rpc } from "pixelpai_proto";

export const MESSAGEKEY_LINK: string = "link";
export const MESSAGEKEY_ADDREGISTRY: string = "addRegistry";
export const MESSAGEKEY_RUNMETHOD: string = "runMethod";

export class RPCPeer {
    private name: string;
    private worker: Worker;
    private onMessageHandlers;
    private registry: webworker_rpc.Executor[];
    private channels: Map<string, MessagePort>;
    private contexts: Map<string, any>;

    constructor(name: string, w: Worker) {
        this.name = name;
        this.worker = w;
        this.registry = [];
        this.channels = new Map();
        this.contexts = new Map();

        // register onMessage handlers
        this.onMessageHandlers = {};
        this.onMessageHandlers[MESSAGEKEY_LINK] = this.onMessage_Link;
        this.onMessageHandlers[MESSAGEKEY_ADDREGISTRY] = this.onMessage_AddRegistry;
        this.onMessageHandlers[MESSAGEKEY_RUNMETHOD] = this.onMessage_RunMethod;

        const handler = this.onMessageHandlers;
        const _self = this;
        this.worker.addEventListener("message", (e) => {
            const { key } = e.data;
            // if (key in handler) {
            //     handler[key](_self, e);
            // }

            console.log("peer on message:", e.data);
            switch (key) {
                case MESSAGEKEY_LINK:
                    _self.onMessage_Link(_self, e);
                    break;
                case MESSAGEKEY_ADDREGISTRY:
                    _self.onMessage_AddRegistry(_self, e);
                    break;
                case MESSAGEKEY_RUNMETHOD:
                    _self.onMessage_RunMethod(_self, e);
                    break;

                default:
                    break;
            }
        });
    }

    public registerMethod(methodName: string, contextName: string, context: any, params?: webworker_rpc.Param[]) {
        console.log("registerMethod: ", this);
        const newData = new webworker_rpc.Executor();
        newData.method = methodName;
        if (contextName !== undefined) newData.context = contextName;
        if (params !== undefined) newData.params = params;

        this.registry.push(newData);
        this.contexts.set(contextName, context);

        this.channels.forEach((port) => {
            port.postMessage({ "key": MESSAGEKEY_ADDREGISTRY, "data": newData });// TODO:transterable
        });
    }

    public callMethod(worker: string, methodName: string, context?: string, params?: webworker_rpc.Param[], callback?: webworker_rpc.Executor) {
        console.log("callMethod: ", this);
        const executor = this.registry.find((x) => x.context === context && x.method === methodName);
        if (executor === null) {
            console.error("method <" + methodName + "> not register");
            return;
        }

        // if (!this.channels.has(worker)) {
        //     console.error("worker <" + worker + "> not found", this.channels);
        //     return;
        // }

        const packet = new webworker_rpc.WebWorkerPacket();
        packet.header = new webworker_rpc.Header();
        packet.header.serviceName = this.name;
        packet.header.remoteExecutor = new webworker_rpc.Executor();
        packet.header.remoteExecutor.method = methodName;
        if (context !== undefined) packet.header.remoteExecutor.context = context;
        if (params !== undefined) packet.header.remoteExecutor.params = params;
        if (callback !== undefined) packet.header.callbackExecutor = callback;

        if (this.channels.has(worker))
            this.channels.get(worker).postMessage({ "key": MESSAGEKEY_RUNMETHOD, "data": packet });// TODO:transterable
    }

    public addLink(worker: string, port: MessagePort) {
        this.channels.set(worker, port);
        console.log("onMessage_Link:", this.channels);
        port.onmessage = (_e) => {
            const { key } = _e.data;
            switch (key) {
                case MESSAGEKEY_ADDREGISTRY:
                    this.onMessage_AddRegistry(this, _e);
                    break;
                case MESSAGEKEY_RUNMETHOD:
                    this.onMessage_RunMethod(this, _e);
                    break;

                default:
                    break;
            }
        }
    }

    private onMessage_Link(peer: RPCPeer, e) {
        const { data } = e.data;
        const port = e.ports[0];
        peer.addLink(data, port);
    }
    private onMessage_AddRegistry(peer: RPCPeer, e) {
        console.log("onMessage_AddRegistry:", e.data);
        const { data } = e.data;
        peer.registry.push(data as webworker_rpc.Executor);
    }
    private onMessage_RunMethod(peer: RPCPeer, e) {
        console.log("onMessage_RunMethod:", e.data);
        const { data } = e.data;
        const packet: webworker_rpc.WebWorkerPacket = data as webworker_rpc.WebWorkerPacket;

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
        const result = peer.executeFunctionByName(remoteExecutor.method, remoteExecutor.context, params);
        if (result !== null && result instanceof Promise) {
            result.then((e) => {
                // if (e instanceof webworker_rpc.Param[]) return; // TODO

                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    const callbackParams = e as webworker_rpc.Param[];
                    // check param type
                    // for (const p of callback.params) {

                    // }
                    peer.callMethod(packet.header.serviceName, callback.method, callback.context, callbackParams);
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
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

    constructor(name: string, w: Worker) {
        this.name = name;
        this.worker = w;
        this.registry = [];
        this.channels = new Map();

        // register onMessage handlers
        this.onMessageHandlers[MESSAGEKEY_LINK] = this.onMessage_Link;
        this.onMessageHandlers[MESSAGEKEY_ADDREGISTRY] = this.onMessage_AddRegistry;
        this.onMessageHandlers[MESSAGEKEY_RUNMETHOD] = this.onMessage_RunMethod;
    }

    public onMessage(e) {
        const { key } = e.data;
        if (key in this.onMessageHandlers) {
            this.onMessageHandlers[key](e);
        }
    }

    public registerMethod(methodName: string, context?: string, params?: webworker_rpc.Param[]) {
        const newData = new webworker_rpc.Executor();
        newData.method = methodName;
        if (context !== undefined) newData.context = context;
        if (params !== undefined) newData.params = params;

        this.registry.push(newData);

        this.channels.forEach((port) => {
            port.postMessage({ "key": MESSAGEKEY_ADDREGISTRY, "data": newData });// TODO:transterable
        });
    }

    public callMethod(worker: string, methodName: string, context?: string, params?: webworker_rpc.Param[], callback?: webworker_rpc.Executor) {
        const executor = this.registry.find((x) => x.context === context && x.method === methodName);
        if (executor === null) {
            console.error("method <" + methodName + "> not register");
            return;
        }

        if (!(worker in this.channels)) {
            console.error("worker <" + worker + "> not found");
        }

        const packet = new webworker_rpc.WebWorkerPacket();
        packet.header = new webworker_rpc.Header();
        packet.header.serviceName = this.name;
        packet.header.remoteExecutor = new webworker_rpc.Executor();
        packet.header.remoteExecutor.method = methodName;
        if (context !== undefined) packet.header.remoteExecutor.context = context;
        if (params !== undefined) packet.header.remoteExecutor.params = params;
        if (callback !== undefined) packet.header.callbackExecutor = callback;

        this.channels[worker].postMessage({ "key": MESSAGEKEY_RUNMETHOD, "data": packet });// TODO:transterable
    }

    private onMessage_Link(e) {
        const { data } = e.data;
        const port = e.ports[0];
        this.channels[data] = port;
    }
    private onMessage_AddRegistry(e) {
        const { data } = e.data;
        this.registry.push(data as webworker_rpc.Executor);
    }
    private onMessage_RunMethod(e) {
        const { data } = e.data;
        const packet: webworker_rpc.WebWorkerPacket = data as webworker_rpc.WebWorkerPacket;

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
                    default:
                        break;
                }
            }
        }
        const result = this.executeFunctionByName(remoteExecutor.method, remoteExecutor.context, params);
        if (result instanceof Promise) {
            result.then(() => {
                if (packet.header.callbackExecutor) {
                    const callback = packet.header.callbackExecutor;
                    const callbackParams = [];
                    for (const p of callback.params) {
                        callbackParams.push(new webworker_rpc.Param(p));
                    }
                    this.callMethod(packet.header.serviceName, callback.method, callback.context, callbackParams);
                }
            });
        }
    }

    private executeFunctionByName(functionName: string, context: string, args?: any[]) {
        // const args = Array.prototype.slice.call(arguments, 2);
        const namespaces = functionName.split(".");
        var func = namespaces.pop();
        for (var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }
        return context[func].apply(context, args);
    }
}
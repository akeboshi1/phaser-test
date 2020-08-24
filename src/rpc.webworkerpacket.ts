import { webworker_rpc } from "pixelpai_proto";

export class RPCWebWorkerPacket extends webworker_rpc.WebWorkerPacket {
    constructor(service: string, method: string, context?: string, params?: webworker_rpc.Param[], callback?: webworker_rpc.Executor) {
        super();

        this.header = new webworker_rpc.Header();
        this.header.serviceName = service;
        this.header.remoteExecutor = new webworker_rpc.Executor();
        this.header.remoteExecutor.method = method;
        if (context !== undefined) this.header.remoteExecutor.context = context;
        if (params !== undefined) this.header.remoteExecutor.params = params;
        if (callback !== undefined) this.header.callbackExecutor = callback;
    }
}
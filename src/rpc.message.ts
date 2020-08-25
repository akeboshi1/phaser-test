import { webworker_rpc } from "pixelpai_proto"

export class RPCMessage extends webworker_rpc.WebWorkerMessage {
    constructor(key: string, data: webworker_rpc.ExecutePacket | webworker_rpc.Executor) {
        super();

        this.key = key;
        if (data instanceof webworker_rpc.ExecutePacket) {
            this.dataPackage = data;
        } else if (data instanceof webworker_rpc.Executor) {
            this.dataExecutor = data;
        }
    }
}

// worker调用其他worker方法的数据结构
export class RPCExecutePacket extends webworker_rpc.ExecutePacket {
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

    static checkType(obj) {
        if (!("header" in obj)) return false;
        const header = obj["header"];
        if (!("serviceName" in header)) return false;
        if (!("remoteExecutor" in header)) return false;
        const remoteExecutor = header["remoteExecutor"];
        if (!RPCExecutor.checkType(remoteExecutor)) return false;

        return true;
    }
}

// worker更新方法注册表后通知其他worker的数据结构
export class RPCExecutor extends webworker_rpc.Executor {
    constructor(method: string, context: string, params?: webworker_rpc.Param[]) {
        super();
        this.method = method;
        if (context !== undefined) this.context = context;
        if (params !== undefined) this.params = params;
    }

    static checkType(obj) {
        if (!("method" in obj)) return false;

        return true;
    }
}
import { webworker_rpc } from "pixelpai_proto"

export class RPCMessage extends webworker_rpc.WebWorkerMessage {
    constructor(key: string, data: webworker_rpc.ExecutePacket | webworker_rpc.RegistryPacket) {
        super();

        this.key = key;
        if (data instanceof webworker_rpc.ExecutePacket) {
            this.dataExecute = data;
        } else if (data instanceof webworker_rpc.RegistryPacket) {
            this.dataRegistry = data;
        }
    }
}

export class RPCRegistryPacket extends webworker_rpc.RegistryPacket {
    constructor(service: string, executors: webworker_rpc.Executor[]) {
        super();

        this.serviceName = service;
        this.executors = executors;
    }

    static checkType(obj) {
        if (!obj) return false;
        if (!("serviceName" in obj)) return false;
        if ("executors" in obj) {
            if (!Array.isArray(obj["executors"])) return false;
            if (obj["executors"].length > 0) {
                for (const one of obj["executors"]) {
                    if (!RPCExecutor.checkType(one)) return false;
                }
            }
        }

        return true;
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
        if (context) this.header.remoteExecutor.context = context;
        if (params) this.header.remoteExecutor.params = params;
        if (callback) this.header.callbackExecutor = callback;
    }

    static checkType(obj) {
        if (!obj) return false;
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
        if (context) this.context = context;
        if (params) this.params = params;
    }

    static checkType(obj) {
        if (!obj) return false;
        if (!("method" in obj)) return false;
        if ("params" in obj) {
            if (!Array.isArray(obj["params"])) return false;
            if (obj["params"].length > 0) {
                for (const one of obj["params"]) {
                    if (!RPCParam.checkType(one)) return false;
                }
            }
        }

        return true;
    }
}

export class RPCParam extends webworker_rpc.Param {

    constructor(t: webworker_rpc.ParamType, val?: any) {
        super();

        this.t = t;
        if (val) {
            switch (t) {
                case webworker_rpc.ParamType.str:
                    if (typeof val !== "string") {
                        console.error(`${val} is not type of string`);
                        return;
                    }
                    this.valStr = val;
                    break;
                case webworker_rpc.ParamType.boolean:
                    if (typeof val !== "boolean") {
                        console.error(`${val} is not type of boolean`);
                        return;
                    }
                    this.valBool = val;
                    break;
                case webworker_rpc.ParamType.num:
                    if (typeof val !== "number") {
                        console.error(`${val} is not type of number`);
                        return;
                    }
                    this.valNum = val;
                    break;
                case webworker_rpc.ParamType.unit8array:
                    if (val.constructor !== Uint8Array) {
                        console.error(`${val} is not type of Uint8Array`);
                        return;
                    }
                    this.valBytes = val;
                    break;
                default:
                    console.error("unkonw type : ", t);
                    break;
            }
        }
    }

    static checkType(obj) {
        if (!obj) return false;
        if (!("t" in obj)) return false;

        return true;
    }

    static typeOf(val): webworker_rpc.ParamType {
        if (typeof val === "string") {
            return webworker_rpc.ParamType.str;
        } else if (typeof val === "boolean") {
            return webworker_rpc.ParamType.boolean;
        } else if (typeof val === "number") {
            return webworker_rpc.ParamType.num;
        } else if (val.constructor === Uint8Array) {
            return webworker_rpc.ParamType.unit8array;
        }

        return webworker_rpc.ParamType.UNKNOWN;
    }
}
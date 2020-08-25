import { webworker_rpc } from "pixelpai_proto";
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
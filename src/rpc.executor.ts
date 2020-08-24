import { webworker_rpc } from "pixelpai_proto";

export class RPCExecutor extends webworker_rpc.Executor {
    constructor(method: string, context: string, params?: webworker_rpc.Param[]) {
        super();
        this.method = method;
        if (context !== undefined) this.context = context;
        if (params !== undefined) this.params = params;
    }
}
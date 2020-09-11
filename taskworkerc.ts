import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";

const worker: Worker = self as any;
class WorkerCContext extends RPCPeer {
    constructor() {
        super("workerC", worker);
    }

    @RPCFunction([webworker_rpc.ParamType.unit8array])
    public methodC(val: Uint8Array): Promise<string> {
        // tslint:disable-next-line:no-console
        console.log("methodC: ", val);
        return new Promise<string>((resolve, reject) => {
            resolve("callback from WorkerC");
        });
    }
}

const context: WorkerCContext = new WorkerCContext();
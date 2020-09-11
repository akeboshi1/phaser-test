import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";
// 子worker
const worker: Worker = self as any;
class WorkerAContext extends RPCPeer {
    constructor() {
        super("workerA", worker);
    }

    @RPCFunction([webworker_rpc.ParamType.boolean])
    public methodA(val: boolean): Promise<string> {
        // tslint:disable-next-line:no-console
        console.log("methodA: ", val);
        return new Promise<string>((resolve, reject) => {
            resolve("callback from WorkerA");
        });
    }
}

const context: WorkerAContext = new WorkerAContext();
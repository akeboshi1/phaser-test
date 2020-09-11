import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";

const worker: Worker = self as any;
class WorkerBContext extends RPCPeer {
    constructor() {
        super("workerB", worker);
    }

    @RPCFunction([webworker_rpc.ParamType.num])
    public methodB(val: number): Promise<string> {
        // tslint:disable-next-line:no-console
        console.log("methodB: ", val);
        return new Promise<string>((resolve, reject) => {
            resolve("callback from WorkerB");
        });
    }
}

const context: WorkerBContext = new WorkerBContext();
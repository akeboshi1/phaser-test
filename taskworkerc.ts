import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        // tslint:disable-next-line:no-console
        console.log("workerC onmessage: init");
        if (contextC.inited) return;
        contextC.inited = true;

        peer = new RPCPeer("workerC", self as any);
    } else if (key === "register") {
        peer.registerExecutor(contextC, new RPCExecutor("methodC", "contextC",
            [new RPCParam(webworker_rpc.ParamType.arrayBuffer)]));
    }
}

class WorkerCContext {
    public inited: boolean = false;
    public methodC(val: Uint8Array): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("methodC: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            resolve([new RPCParam(webworker_rpc.ParamType.str, "callback from WorkerC")]);
        });
    }
}

const contextC: WorkerCContext = new WorkerCContext();
let peer: RPCPeer;
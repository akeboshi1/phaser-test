import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./src/rpc.executor";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        console.log("workerB onmessage: init");
        if (contextB.inited) return;
        contextB.inited = true;

        peer = new RPCPeer("workerB", self as any);
    } else if (key === "register") {
        const param1 = new webworker_rpc.Param();
        param1.t = webworker_rpc.ParamType.num;
        param1.valNum = 123;
        peer.registerExecutor(contextB, new RPCExecutor("methodB", "contextB", [param1]));
    }
}

class WorkerBContext {
    public inited: boolean = false;
    public methodB(val: number): Promise<webworker_rpc.Param[]> {
        console.log("methodB: ", val);

        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            const param1 = new webworker_rpc.Param();
            param1.t = webworker_rpc.ParamType.str;
            param1.valStr = "callback from WorkerB";
            resolve([param1]);
        });
    }
}

const contextB: WorkerBContext = new WorkerBContext();
let peer: RPCPeer;
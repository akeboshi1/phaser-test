import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        console.log("workerA onmessage: init");
        if (contextA.inited) return;
        contextA.inited = true;

        contextA.peer = new RPCPeer("workerA", self as any);
    } else if (key === "register") {
        const param1 = new webworker_rpc.Param();
        param1.t = webworker_rpc.ParamType.boolean;
        param1.valBool = true;
        contextA.peer.registerMethod("methodA", "contextA", contextA, [param1]);
    }
}

class WorkerAContext {
    public inited: boolean = false;
    public peer: RPCPeer;
    public methodA(val: boolean): Promise<webworker_rpc.Param[]> {
        console.log("methodA: ", val);

        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            const param1 = new webworker_rpc.Param();
            param1.t = webworker_rpc.ParamType.str;
            param1.valStr = "callback from WorkerA";
            resolve([param1]);
        });
    }
}

const contextA: WorkerAContext = new WorkerAContext();
import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./src/rpc.executor";
// 子worker
onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        // tslint:disable-next-line:no-console
        console.log("workerA onmessage: init");
        if (contextA.inited) return;
        contextA.inited = true;

        peer = new RPCPeer("workerA", self as any);
    } else if (key === "register") {
        const param1 = new webworker_rpc.Param();
        param1.t = webworker_rpc.ParamType.boolean;
        param1.valBool = true;
        peer.registerExecutor(contextA, new RPCExecutor("methodA", "contextA", [param1]));
    }
}

class WorkerAContext {
    public inited: boolean = false;
    public methodA(val: boolean): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
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
let peer: RPCPeer;
import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";
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
        peer.registerExecutor(contextA, new RPCExecutor("methodA", "contextA",
            [new RPCParam(webworker_rpc.ParamType.boolean)]));
    }
}

class WorkerAContext {
    public inited: boolean = false;
    public methodA(val: boolean): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("methodA: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            resolve([new RPCParam(webworker_rpc.ParamType.str, "callback from WorkerA")]);
        });
    }
}

const contextA: WorkerAContext = new WorkerAContext();
let peer: RPCPeer;
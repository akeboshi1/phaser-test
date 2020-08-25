import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./src/rpc.message";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        // tslint:disable-next-line:no-console
        console.log("workerC onmessage: init");
        if (contextC.inited) return;
        contextC.inited = true;

        peer = new RPCPeer("workerC", self as any);
    } else if (key === "register") {
        const param1 = new webworker_rpc.Param();
        param1.t = webworker_rpc.ParamType.str;
        param1.valStr = "xxx";
        peer.registerExecutor(contextC, new RPCExecutor("methodC", "contextC", [param1]));
    }
}

class WorkerCContext {
    public inited: boolean = false;
    public methodC(val: string): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("methodC: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            const param1 = new webworker_rpc.Param();
            param1.t = webworker_rpc.ParamType.str;
            param1.valStr = "callback from WorkerC";
            resolve([param1]);
        });
    }
}

const contextC: WorkerCContext = new WorkerCContext();
let peer: RPCPeer;
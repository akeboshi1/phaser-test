import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./src/rpc.message";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        // tslint:disable-next-line:no-console
        console.log("heartBeatWorker onmessage: init");
        if (heartBeatWorkerContext.inited) return;
        heartBeatWorkerContext.inited = true;

        peer = new RPCPeer("heartBeatWorker", self as any);
    } else if (key === "register") {
        const param = new webworker_rpc.Param();
        param.t = webworker_rpc.ParamType.num;
        param.valNum = 123;
        peer.registerExecutor(heartBeatWorkerContext, new RPCExecutor("heartBeatWorkerMethod", "heartBeatWorkerContext", [param]));
    }
}

class HeartBeatWorkerContext {
    public inited: boolean = false;
    public heartBeatWorkerMethod(val: number): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("heartBeatWorkerMethod: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            const param = new webworker_rpc.Param();
            param.t = webworker_rpc.ParamType.str;
            param.valStr = "callback from HeartBeatWorker";
            resolve([param]);
        });
    }
}

const heartBeatWorkerContext: HeartBeatWorkerContext = new HeartBeatWorkerContext();
let peer: RPCPeer;
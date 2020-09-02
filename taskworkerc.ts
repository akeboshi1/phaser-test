import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        const { data } = e.data;

        // tslint:disable-next-line:no-console
        console.log("workerC onmessage: init");
        if (contextC.inited) return;
        contextC.inited = true;

        for (let i = 0; i < e.ports.length; i++) {
            const port = e.ports[i];
            peer.addLink(data[i], port);
        }
    }
}

class WorkerCContext {
    public inited: boolean = false;

    @RPCFunction([webworker_rpc.ParamType.unit8array])
    public methodC(val: Uint8Array): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("methodC: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            resolve([new RPCParam(webworker_rpc.ParamType.str, "callback from WorkerC")]);
        });
    }
}

const contextC: WorkerCContext = new WorkerCContext();
let peer: RPCPeer = new RPCPeer("workerC", self as any);
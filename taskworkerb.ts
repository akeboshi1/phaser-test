import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";

onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        const { data } = e.data;

        // tslint:disable-next-line:no-console
        console.log("workerB onmessage: init");
        if (contextB.inited) return;
        contextB.inited = true;

        peer = new RPCPeer("workerB", self as any);

        for (let i = 0; i < e.ports.length; i++) {
            const port = e.ports[i];
            peer.addLink(data[i], port);
        }
    } else if (key === "register") {
        // peer.registerExecutor(contextB, new RPCExecutor("methodB", "contextB",
        //     [new RPCParam(webworker_rpc.ParamType.num)]));
    }
}

class WorkerBContext {
    public inited: boolean = false;

    @RPCFunction([webworker_rpc.ParamType.num])
    public methodB(val: number): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("methodB: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            resolve([new RPCParam(webworker_rpc.ParamType.str, "callback from WorkerB")]);
        });
    }
}

const contextB: WorkerBContext = new WorkerBContext();
let peer: RPCPeer;
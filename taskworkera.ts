import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCParam } from "./src/rpc.message";
// 子worker
onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        const { data } = e.data;

        // tslint:disable-next-line:no-console
        console.log("workerA onmessage: init");
        if (contextA.inited) return;
        contextA.inited = true;

        for (let i = 0; i < e.ports.length; i++) {
            const port = e.ports[i];
            peer.addLink(data[i], port);
        }
    }
}

class WorkerAContext {
    public inited: boolean = false;

    @RPCFunction([webworker_rpc.ParamType.boolean])
    public methodA(val: boolean): Promise<string> {
        // tslint:disable-next-line:no-console
        console.log("methodA: ", val);
        return new Promise<string>((resolve, reject) => {
            resolve("callback from WorkerA");
        });
    }
}

const contextA: WorkerAContext = new WorkerAContext();
let peer: RPCPeer = new RPCPeer("workerA", self as any);
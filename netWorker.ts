import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor } from "./src/rpc.message";
// 子worker
onmessage = (e) => {
    const { key } = e.data;
    if (key === "init") {
        // tslint:disable-next-line:no-console
        console.log("networkerContext onmessage: init");
        if (networkerContext.inited) return;
        networkerContext.inited = true;

        peer = new RPCPeer("networkerContext", self as any);
    } else if (key === "register") {
        const param = new webworker_rpc.Param();
        param.t = webworker_rpc.ParamType.boolean;
        param.valBool = true;
        peer.registerExecutor(networkerContext, new RPCExecutor("netWorkerMethod", "networkerContext", [param]));
    }
}

class NetWorkerContext {
    public inited: boolean = false;
    public netWorkerMethod(val: boolean): Promise<webworker_rpc.Param[]> {
        // tslint:disable-next-line:no-console
        console.log("netWorkerMethod: ", val);
        return new Promise<webworker_rpc.Param[]>((resolve, reject) => {
            const param = new webworker_rpc.Param();
            param.t = webworker_rpc.ParamType.str;
            param.valStr = "callback from NetWorker";
            resolve([param]);
        });
    }
}

const networkerContext: NetWorkerContext = new NetWorkerContext();
let peer: RPCPeer;
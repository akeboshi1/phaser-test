import TaskWorkerA from "worker-loader?name=dist/[name].js!./taskworkera";
import TaskWorkerB from "worker-loader?name=dist/[name].js!./taskworkerb";
import TaskWorkerC from "worker-loader?name=dist/[name].js!./taskworkerc";
import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCExecutePacket, RPCParam } from "./src/rpc.message";

// 主worker 创建子worker 并创建连接
const worker: Worker = self as any;
worker.onmessage = (e) => {
    if (e.data === "init") {
        // tslint:disable-next-line:no-console
        console.log("foremanworker onmessage: init");
        if (context1.inited) return;
        context1.inited = true;

        const workerA = new TaskWorkerA();
        const workerB = new TaskWorkerB();
        const workerC = new TaskWorkerC();

        const channelFA = new MessageChannel();
        const channelFB = new MessageChannel();
        const channelFC = new MessageChannel();

        peer.addLink("workerA", channelFA.port1);
        peer.addLink("workerB", channelFB.port1);
        peer.addLink("workerC", channelFC.port1);

        workerA.postMessage({ "key": "init", "data": ["foreman"] }, [channelFA.port2]);
        workerB.postMessage({ "key": "init", "data": ["foreman"] }, [channelFB.port2]);
        workerC.postMessage({ "key": "init", "data": ["foreman"] }, [channelFC.port2]);

    } else if (e.data === "start") {
        // tslint:disable-next-line:no-console
        console.log("foremanworker onmessage: start");
        const callback = new RPCExecutor("foremanCallback", "ForemanContext",
            [new RPCParam(webworker_rpc.ParamType.str)]);

        // A
        if (peer.isChannelReady("workerA")) {
            peer.remote.workerA.WorkerAContext.methodA(callback, true);
        }

        // B
        if ("workerB" in peer.remote) {
            peer.remote.workerB.WorkerBContext.methodB(null, 333);
        }

        // C
        if (peer.isChannelReady("workerC")) {
            peer.remote.workerC.WorkerCContext.methodC(callback, new Uint8Array(webworker_rpc.Executor.encode(callback).finish().buffer.slice(0)));
        }
    }
}

// worker对应的实体，用于注册worker之间的回调，方法
class ForemanContext {
    public inited: boolean = false;

    @RPCFunction([webworker_rpc.ParamType.str])
    public foremanCallback(val: string) {
        // tslint:disable-next-line:no-console
        console.log("foremanCallback: ", val);
    }
}

const context1: ForemanContext = new ForemanContext();
let peer: RPCPeer = new RPCPeer("foreman", worker);
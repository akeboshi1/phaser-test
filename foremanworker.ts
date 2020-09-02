import TaskWorkerA from "worker-loader?name=dist/[name].js!./taskworkera";
import TaskWorkerB from "worker-loader?name=dist/[name].js!./taskworkerb";
import TaskWorkerC from "worker-loader?name=dist/[name].js!./taskworkerc";
import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCExecutePacket, RPCParam } from "./src/rpc.message";

// 主worker
const worker: Worker = self as any;
worker.onmessage = (e) => {
    if (e.data === "init") {
        // tslint:disable-next-line:no-console
        console.log("foremanworker onmessage: init");
        if (context1.inited) return;
        context1.inited = true;

        context1.workerA = new TaskWorkerA();
        context1.workerB = new TaskWorkerB();
        context1.workerC = new TaskWorkerC();

        const channelFA = new MessageChannel();
        const channelFB = new MessageChannel();
        const channelFC = new MessageChannel();
        const channelAB = new MessageChannel();
        const channelAC = new MessageChannel();
        const channelBC = new MessageChannel();

        peer.addLink("workerA", channelFA.port1);
        peer.addLink("workerB", channelFB.port1);
        peer.addLink("workerC", channelFC.port1);

        context1.workerA.postMessage({ "key": "init", "data": ["foreman", "workerB", "workerC"] }, [channelFA.port2, channelAB.port1, channelAC.port1]);
        context1.workerB.postMessage({ "key": "init", "data": ["foreman", "workerA", "workerC"] }, [channelFB.port2, channelAB.port2, channelBC.port1]);
        context1.workerC.postMessage({ "key": "init", "data": ["foreman", "workerA", "workerB"] }, [channelFC.port2, channelAC.port2, channelBC.port2]);

    } else if (e.data === "start") {
        // tslint:disable-next-line:no-console
        console.log("foremanworker onmessage: start");
        const callback = new RPCExecutor("foremanCallback", "ForemanContext",
            [new RPCParam(webworker_rpc.ParamType.str)]);

        // A
        if (peer.isChannelReady("workerA"))
            peer.execute("workerA", new RPCExecutePacket(peer.name, "methodA", "WorkerAContext",
                [new RPCParam(webworker_rpc.ParamType.boolean, true)], callback));

        // B
        if (peer.isChannelReady("workerB"))
            peer.execute("workerB", new RPCExecutePacket(peer.name, "methodB", "WorkerBContext",
                [new RPCParam(webworker_rpc.ParamType.num, 333)], callback));

        // C
        if (peer.isChannelReady("workerC"))
            peer.execute("workerC", new RPCExecutePacket(peer.name, "methodC", "WorkerCContext",
                [new RPCParam(webworker_rpc.ParamType.unit8array, new Uint8Array(webworker_rpc.Executor.encode(callback).finish().buffer.slice(0)))], callback));
    }
}

// worker对应的实体，用于注册worker之间的回调，方法
class ForemanContext {
    public inited: boolean = false;
    public workerA: TaskWorkerA;
    public workerB: TaskWorkerB;
    public workerC: TaskWorkerC;

    @RPCFunction([webworker_rpc.ParamType.str])
    public foremanCallback(val: string) {
        // tslint:disable-next-line:no-console
        console.log("foremanCallback: ", val);
    }
}

const context1: ForemanContext = new ForemanContext();
let peer: RPCPeer = new RPCPeer("foreman", worker);
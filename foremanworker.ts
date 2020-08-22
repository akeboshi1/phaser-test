import TaskWorkerA from "worker-loader?name=dist/[name].js!./taskworkera";
import TaskWorkerB from "worker-loader?name=dist/[name].js!./taskworkerb";
import TaskWorkerC from "worker-loader?name=dist/[name].js!./taskworkerc";
import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";

const worker: Worker = self as any;
worker.onmessage = (e) => {
    if (e.data === "init") {
        console.log("foremanworker onmessage: init");
        if (context1.inited) return;
        context1.inited = true;

        context1.peer = new RPCPeer("foreman", worker);

        context1.workerA = new TaskWorkerA();
        context1.workerA.postMessage({ "key": "init" });
        context1.workerB = new TaskWorkerB();
        context1.workerB.postMessage({ "key": "init" });
        context1.workerC = new TaskWorkerC();
        context1.workerC.postMessage({ "key": "init" });

        const channelFA = new MessageChannel();
        const channelFB = new MessageChannel();
        const channelFC = new MessageChannel();
        const channelAB = new MessageChannel();
        const channelAC = new MessageChannel();
        const channelBC = new MessageChannel();

        context1.peer.addLink("workerA", channelFA.port1);
        context1.workerA.postMessage({ "key": "link", "data": "foreman" }, [channelFA.port2]);
        context1.peer.addLink("workerB", channelFB.port1);
        context1.workerB.postMessage({ "key": "link", "data": "foreman" }, [channelFB.port2]);
        context1.peer.addLink("workerC", channelFC.port1);
        context1.workerC.postMessage({ "key": "link", "data": "foreman" }, [channelFC.port2]);

        context1.workerA.postMessage({ "key": "link", "data": "workerB" }, [channelAB.port1]);
        context1.workerB.postMessage({ "key": "link", "data": "workerA" }, [channelAB.port2]);
        context1.workerA.postMessage({ "key": "link", "data": "workerC" }, [channelAC.port1]);
        context1.workerC.postMessage({ "key": "link", "data": "workerA" }, [channelAC.port2]);
        context1.workerB.postMessage({ "key": "link", "data": "workerC" }, [channelBC.port1]);
        context1.workerC.postMessage({ "key": "link", "data": "workerB" }, [channelBC.port2]);

    } else if (e.data === "register") {
        if (context1.registed) return;
        context1.registed = true;

        const param1 = new webworker_rpc.Param();
        param1.t = webworker_rpc.ParamType.str;
        param1.valStr = "callbackFrom";
        context1.peer.registerMethod("foremanCallback", "context1", context1, [param1]);

        context1.workerA.postMessage({ "key": "register" });
        context1.workerB.postMessage({ "key": "register" });
        context1.workerC.postMessage({ "key": "register" });
    } else if (e.data === "start") {
        console.log("foremanworker onmessage: start");
        const callback = new webworker_rpc.Executor();
        callback.method = "foremanCallback";
        callback.context = "context1";
        const paramCB = new webworker_rpc.Param();
        paramCB.t = webworker_rpc.ParamType.str;
        paramCB.valStr = "callbackFrom";
        callback.params = [paramCB];

        // A
        const paramA = new webworker_rpc.Param();
        paramA.t = webworker_rpc.ParamType.boolean;
        paramA.valBool = true;
        context1.peer.callMethod("workerA", "methodA", "contextA", [paramA], callback);

        // B
        const paramB = new webworker_rpc.Param();
        paramB.t = webworker_rpc.ParamType.num;
        paramB.valNum = 333;
        context1.peer.callMethod("workerB", "methodB", "contextB", [paramB], callback);

        // C
        const paramC = new webworker_rpc.Param();
        paramC.t = webworker_rpc.ParamType.str;
        paramC.valStr = "三三三";
        context1.peer.callMethod("workerC", "methodC", "contextC", [paramC], callback);
    }
}

class ForemanContext {
    public peer: RPCPeer;
    public inited: boolean = false;
    public registed: boolean = false;
    public workerA: TaskWorkerA;
    public workerB: TaskWorkerB;
    public workerC: TaskWorkerC;
    public foremanCallback(val: string) {
        console.log("foremanCallback: ", val);
    }
}

const context1: ForemanContext = new ForemanContext();
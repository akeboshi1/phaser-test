import NetWorker from "worker-loader?name=dist/[name].js!./netWorker";
import HeartBeatWorker from "worker-loader?name=dist/[name].js!./heartBeatworker";
import { RPCPeer } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCExecutePacket } from "./src/rpc.message";

// 主worker
const worker: Worker = self as any;
worker.onmessage = (e) => {
    if (e.data === "init") {
        // tslint:disable-next-line:no-console
        console.log("mainWorker onmessage: init");
        if (context.inited) return;
        context.inited = true;

        context.peer = new RPCPeer("mainWorker", worker);
        const netWorker = new NetWorker();
        const heartBeatworker = new HeartBeatWorker();
        // 增加worker引用
        context.addWorker(NET_WORKER, netWorker);
        context.addWorker(HEARTBEAT_WORKER, heartBeatworker);
        const initState: WorkerState = {
            "key": "init"
        }
        // 初始化worker状态
        context.initWorker(NET_WORKER, initState);
        context.initWorker(HEARTBEAT_WORKER, initState);

        // networker与main之间通道
        const channelNetToMain = new MessageChannel();
        // heartbeat与main之间的通道
        const channelHeartBeatToMain = new MessageChannel();
        // networker与heartbeat之间的通道
        const channelNetToHeartBeat = new MessageChannel();
        const linkMainState: WorkerState = {
            "key": "link",
            "data": MAIN_WORKER
        }
        // 将worker与channel通道联系起来
        context.linkMainWorker(NET_WORKER, linkMainState, channelNetToMain);
        context.linkMainWorker(HEARTBEAT_WORKER, linkMainState, channelHeartBeatToMain);
        context.linkWorker(NET_WORKER, { "key": "link", "data": HEARTBEAT_WORKER }, channelNetToHeartBeat.port1);
        context.linkWorker(HEARTBEAT_WORKER, { "key": "link", "data": NET_WORKER }, channelNetToHeartBeat.port2);

    } else if (e.data === "register") {
        // worker注册表方法更新
        if (context.registed) return;
        context.registed = true;

        const param = new webworker_rpc.Param();
        param.t = webworker_rpc.ParamType.str;
        param.valStr = "callbackFrom";
        context.peer.registerExecutor(context, new RPCExecutor("mainWorkerCallback", "context", [param]));
        const registerState: WorkerState = {
            "key": "register"
        };
        context.registerExecutor(registerState);
    } else if (e.data === "start") {
        // 由socket通信影响对应worker
        // tslint:disable-next-line:no-console
        console.log("mainWorker onmessage: start");
        const callback = new webworker_rpc.Executor();
        callback.method = "mainWorkerCallback";
        callback.context = "context";
        const paramCB = new webworker_rpc.Param();
        paramCB.t = webworker_rpc.ParamType.str;
        paramCB.valStr = "callbackFrom";
        callback.params = [paramCB];

        // // A
        // const paramA = new webworker_rpc.Param();
        // paramA.t = webworker_rpc.ParamType.boolean;
        // paramA.valBool = true;
        // peer.execute("workerA", new RPCExecutePacket(peer.name, "methodA", "contextA", [paramA], callback));

        // // B
        // const paramB = new webworker_rpc.Param();
        // paramB.t = webworker_rpc.ParamType.num;
        // paramB.valNum = 333;
        // peer.execute("workerB", new RPCExecutePacket(peer.name, "methodB", "contextB", [paramB], callback));

        // // C
        // const paramC = new webworker_rpc.Param();
        // paramC.t = webworker_rpc.ParamType.arrayBuffer;
        // paramC.valBytes = new Uint8Array(webworker_rpc.Executor.encode(callback).finish().buffer.slice(0));
        // peer.execute("workerC", new RPCExecutePacket(peer.name, "methodC", "contextC", [paramC], callback));
        // const paramC = new webworker_rpc.Param();
        // paramC.t = webworker_rpc.ParamType.arrayBuffer;
        // paramC.valBytes = new Uint8Array(webworker_rpc.Executor.encode(callback).finish().buffer.slice(0));
        // peer.execute("workerC", new RPCExecutePacket(peer.name, "methodC", "contextC", [paramC], callback));
    }
}

// worker对应的实体，用于注册worker之间的回调，方法
class MainWorkerContext {
    public inited: boolean = false;
    public registed: boolean = false;
    public peer: RPCPeer;
    public workerMap: Map<string, Worker>;
    public addWorker(name: string, webworker: Worker) {
        if (!this.workerMap) this.workerMap = new Map();
        if (this.workerMap[name]) return;
        this.workerMap[name] = webworker;
    }
    public initWorker(name: string, state: WorkerState) {
        if (!this.workerMap || !this.workerMap[name]) return;
        // tslint:disable-next-line:no-shadowed-variable
        const worker: Worker = this.workerMap[name];
        worker.postMessage(state);
    }

    public linkMainWorker(name: string, state: WorkerState, channel: MessageChannel) {
        if (!this.workerMap || !this.workerMap[name]) return;
        this.peer.addLink(name, channel.port1);
        // tslint:disable-next-line:no-shadowed-variable
        const worker: Worker = this.workerMap[name];
        worker.postMessage(state, [channel.port2]);
    }
    public linkWorker(name: string, state: WorkerState, port: MessagePort) {
        if (!this.workerMap || !this.workerMap[name]) return;
        // tslint:disable-next-line:no-shadowed-variable
        const worker: Worker = this.workerMap[name];
        worker.postMessage(state, [port]);
    }
    public registerExecutor(state: WorkerState) {
        this.workerMap.forEach((value: Worker) => {
            value.postMessage(state);
        });
    }
}

interface WorkerState {
    key: string,
    data?: any
}

const context: MainWorkerContext = new MainWorkerContext();
const MAIN_WORKER: string = "mainworker";
const NET_WORKER: string = "networker";
const HEARTBEAT_WORKER: string = "heartbeatworker";
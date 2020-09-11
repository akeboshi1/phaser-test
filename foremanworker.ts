import TaskWorkerA from "worker-loader?name=dist/[name].js!./taskworkera";
import TaskWorkerB from "worker-loader?name=dist/[name].js!./taskworkerb";
import TaskWorkerC from "worker-loader?name=dist/[name].js!./taskworkerc";
import { RPCPeer, RPCFunction } from "./src/rpc.peer";
import { webworker_rpc } from "pixelpai_proto";
import { RPCExecutor, RPCExecutePacket, RPCParam } from "./src/rpc.message";

// 主worker 创建子worker 并创建连接
const worker: Worker = self as any;

// worker对应的实体，用于注册worker之间的回调，方法
class ForemanContext extends RPCPeer {
    constructor() {
        super("foreman", worker);
        const callback = new RPCExecutor("foremanCallback", "ForemanContext",
            [new RPCParam(webworker_rpc.ParamType.str)]);

        this.linkToWorker("workerA", new TaskWorkerA()).onReady(() => {
            this.remote.workerA.WorkerAContext.methodA(callback, true);
        });
        this.linkToWorker("workerB", new TaskWorkerB()).onReady(() => {
            this.remote.workerB.WorkerBContext.methodB(null, 333);
        });
        this.linkToWorker("workerC", new TaskWorkerC()).onReady(() => {
            this.remote.workerC.WorkerCContext.methodC(callback, new Uint8Array(webworker_rpc.Executor.encode(callback).finish().buffer.slice(0)));
        });
    }

    @RPCFunction()
    public methodF() {
        console.log("methodF");
    }

    @RPCFunction([webworker_rpc.ParamType.str])
    public foremanCallback(val: string) {
        // tslint:disable-next-line:no-console
        console.log("foremanCallback: ", val);
    }
}

const context: ForemanContext = new ForemanContext();
import TaskWorkerA from "worker-loader?name=dist/[name].js!./taskworkera";
import TaskWorkerB from "worker-loader?name=dist/[name].js!./taskworkerb";
import TaskWorkerC from "worker-loader?name=dist/[name].js!./taskworkerc";

const worker: Worker = self as any;
worker.onmessage = (e) => {
    if (e.data === "start") {
        const workerA = new TaskWorkerA();
        const workerB = new TaskWorkerB();
        const workerC = new TaskWorkerC();

        const channelAB = new MessageChannel();
        const channelAC = new MessageChannel();
        const channelBC = new MessageChannel();

        workerA.postMessage({ "header": "link", "from": "B" }, [channelAB.port1]);
        workerB.postMessage({ "header": "link", "from": "A" }, [channelAB.port2]);
        workerA.postMessage({ "header": "link", "from": "C" }, [channelAC.port1]);
        workerC.postMessage({ "header": "link", "from": "A" }, [channelAC.port2]);
        workerB.postMessage({ "header": "link", "from": "C" }, [channelBC.port1]);
        workerC.postMessage({ "header": "link", "from": "B" }, [channelBC.port2]);


    }
}
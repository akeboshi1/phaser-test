const testWorker: Worker = self as any;

function start(url: string) {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, true);
    xhr.responseType = "blob";
    xhr.onload = function () {
        if (xhr.readyState === 4) {
            postMessage({ "method": "completeHandler", "data": xhr.response });
            close();
        }
    }
    xhr.send(null);
}

function stop() {
    postMessage({ "method": "stopHandler" });
}

testWorker.onmessage = (ev) => {
    const data: any = ev.data;
    switch (data.method) {
        case "start":
            start(data.url);
            break;
        case "stop":
            stop();
            break;
    }
};
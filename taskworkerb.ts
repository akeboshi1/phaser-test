onmessage = (e) => {
    const { header, from } = e.data;
    if (header === "link") {
        const port = e.ports[0];
        console.log("B: link from " + from);

        port.postMessage("test link; data from B");
        port.onmessage = (e) => {
            console.log("B: port got message: " + e.data);
        }
    }
}
onmessage = (e) => {
    const { header, from } = e.data;
    if (header === "link") {
        const port = e.ports[0];
        console.log("A: link from " + from);

        port.postMessage("test link; data from A");
        port.onmessage = (e) => {
            console.log("A: port got message: " + e.data);
        }
    }
}
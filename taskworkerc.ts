onmessage = (e) => {
    const { header, from } = e.data;
    if (header === "link") {
        const port = e.ports[0];
        console.log("C: link from " + from);

        port.postMessage("test link; data from C");
        port.onmessage = (e) => {
            console.log("C: port got message: " + e.data);
        }
    }
}
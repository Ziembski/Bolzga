let latestData = {};

const evtSource = new EventSource("/sse");

evtSource.onmessage = (e) => {
    latestData = JSON.parse(e.data);

    if (window.updatePageValues) {
        window.updatePageValues(latestData);
    }
};

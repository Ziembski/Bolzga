let latestData = {};

const evtSource = new EventSource("/sse");

evtSource.onmessage = (e) => {
    latestData = JSON.parse(e.data);

    // Global access for delayed DOM loading
    window.latestData = latestData;

    // Call subpage update function if it exists
    if (typeof window.updatePageValues === "function") {
        window.updatePageValues(latestData);
    }
};

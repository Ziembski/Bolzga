const evtSource = new EventSource("/sse");

evtSource.onmessage = (e) => {
    const constants = JSON.parse(e.data);

    for (const key in constants) {
        const el = document.getElementById(key);
        if (el) el.textContent = constants[key];
    }
};

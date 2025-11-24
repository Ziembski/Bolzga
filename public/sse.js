let constants = {};

function connectSSE(updateFn) {
    const sse = new EventSource("/sse");
    sse.onmessage = (msg) => {
        try {
            const data = JSON.parse(msg.data);
            constants = data;
            updateFn();
        } catch {}
    };
}

async function loadInitial(updateFn) {
    const res = await fetch("/constants");
    constants = await res.json();
    updateFn();
}

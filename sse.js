import { fetchCSV } from "./csv.js";

let clients = [];
let lastFirstCell = null;

export function sseHandler(req, res) {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
    });

    res.flushHeaders();

    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
}

export async function startCSVWatcher() {
    setInterval(async () => {
        const data = await fetchCSV();
        const firstCell = data.matrix[0][0];

        if (lastFirstCell !== null && firstCell !== lastFirstCell) {
            sendEvent({ updated: true });
        }

        lastFirstCell = firstCell;
    }, 20000);
}

function sendEvent(payload) {
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
}

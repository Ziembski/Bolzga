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

    console.log(`[SSE] Client connected. Total: ${clients.length}`);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
        console.log(`[SSE] Client disconnected. Total: ${clients.length}`);
    });
}

export async function startCSVWatcher() {
    setInterval(async () => {
        console.log("[WATCHER] Checking CSV…");

        const data = await fetchCSV();
        const firstCell = data.matrix[0][0];

        console.log(`[WATCHER] First cell value: ${firstCell}`);

        if (lastFirstCell !== null && firstCell !== lastFirstCell) {
            console.log(`[WATCHER] CHANGE DETECTED! "${lastFirstCell}" → "${firstCell}"`);
            sendEvent({ updated: true });
        } else {
            console.log("[WATCHER] No change detected.");
        }

        lastFirstCell = firstCell;
    }, 20000);
}

function sendEvent(payload) {
    console.log(`[SSE] Sending update to ${clients.length} clients:`, payload);
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
}

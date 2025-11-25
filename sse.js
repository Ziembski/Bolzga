import { fetchCSV } from "./csv.js";

let clients = [];
let lastFirstCell = null;       // confirmed value
let pendingFirstCell = null;    // latest fetched value

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
        console.log(`[WATCHER] Fetched first cell: ${firstCell}`);

        // debounce / avoid stale first cell
        if (pendingFirstCell !== firstCell) {
            pendingFirstCell = firstCell;
            console.log("[WATCHER] Pending value updated, waiting next check for confirmation.");
            return; // wait next interval to confirm
        }

        // only push SSE if value is confirmed and changed
        if (lastFirstCell !== firstCell) {
            console.log(`[WATCHER] CONFIRMED CHANGE detected: "${lastFirstCell}" → "${firstCell}"`);
            sendEvent({ updated: true });
            lastFirstCell = firstCell; // update confirmed value
        } else {
            console.log("[WATCHER] No confirmed change.");
        }
    }, 10000);
}

function sendEvent(payload) {
    console.log(`[SSE] Sending update to ${clients.length} clients:`, payload);
    clients.forEach(client => {
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
    });
}

// called when manual refresh occurs
export function setLastFirstCell(value) {
    lastFirstCell = value;
    pendingFirstCell = value;
    console.log(`[SSE] lastFirstCell and pendingFirstCell updated manually to: ${value}`);
}

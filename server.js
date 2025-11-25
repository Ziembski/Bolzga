import express from "express";
import fs from "fs";
import { fetchCSV, clearCache } from "./csv.js";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
app.use(express.static("public"));

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let matrixCache = {};
let lastHeaderCell = null;

let sseClients = [];

// Read row number from <meta>
function getRowNumber() {
    const meta = document.querySelector('meta[name="row"]');
    return meta ? parseInt(meta.content, 10) : 1;
}

const row = getRowNumber();

// Gather all <div class="field"> elements
const fieldElements = Array.from(document.querySelectorAll(".field"));

const evt = new EventSource("/events");
evt.onmessage = (e) => {
    console.log("[CLIENT] SSE update received from server.");
    const data = JSON.parse(e.data);
    console.log("[CLIENT] New matrix:", data);
    updatePage(data);
};

function updatePage(matrix) {
    fieldElements.forEach(el => {
        const fieldName = el.dataset.name;       // Example: "Imię"
        const key = `${fieldName}_${row}`;       // Example: "Imię_1"
        const value = matrix[key] || "";

        el.innerText = value;
    });
}

async function loadInitial() {
    console.log("[CLIENT] Loading initial CSV data...");
    const res = await fetch("/api/data");
    const matrix = await res.json();
    console.log("[CLIENT] Initial data loaded:", matrix);
    updatePage(matrix);
}

loadInitial();

// Handle refresh button
const btn = document.getElementById("refresh");
if (btn) {
    btn.onclick = async () => {
        console.log("[CLIENT] Refresh button clicked.");
        await fetch("/api/refresh");
        console.log("[CLIENT] Refresh request sent to server.");
    };
}

// --- SSE endpoint ---
app.get("/events", (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    const client = { id: Date.now(), res };
    sseClients.push(client);

    req.on("close", () => {
        sseClients = sseClients.filter(c => c.id !== client.id);
    });
});

// --- Push SSE update ---
function broadcastUpdate(matrix) {
    console.log(`[SSE] Broadcasting update to ${clients.length} clients...`);

    const payload = `data: ${JSON.stringify(matrix)}\n\n`;

    clients.forEach(res => res.write(payload));
}







// --- Debouncer ---
let debounceTimer = null;
function triggerUpdate(matrix) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        broadcastUpdate(matrix);
    }, 1000); // 1s debounce
}

async function watchCSV() {
    console.log("[WATCHER] Checking CSV for updates...");

    const { matrix, data } = await fetchCSV();
    const timestampStr = data[0]?.[0] || "";
    const newTimestamp = new Date(timestampStr);

    console.log(`[WATCHER] CSV timestamp found: ${timestampStr}`);

    if (isNaN(newTimestamp)) {
        console.log("[WATCHER] WARNING: Timestamp is invalid. Skipping update.");
        return;
    }

    // First initialization
    if (lastHeaderCell === null) {
        lastHeaderCell = newTimestamp;
        matrixCache = matrix;
        console.log("[WATCHER] Initial timestamp set.");
        return;
    }

    // Compare timestamps
    if (newTimestamp > lastHeaderCell) {
        console.log(
            `[WATCHER] CSV UPDATED: Old=${lastHeaderCell.toISOString()}, New=${newTimestamp.toISOString()}`
        );

        lastHeaderCell = newTimestamp;
        matrixCache = matrix;

        triggerUpdate(matrixCache);
    } else {
        console.log("[WATCHER] No update detected (timestamp unchanged).");
    }
}

setInterval(watchCSV, 10000);

// Initial load
await watchCSV();

// --- REST endpoint for subpages to request current data ---
app.get("/api/data", (req, res) => {
    res.json(matrixCache);
});

// --- Clear & refresh CSV ---
app.get("/api/refresh", async (req, res) => {
    console.log("[REFRESH] Manual refresh requested by client.");

    clearCache();

    const { matrix, data } = await fetchCSV();

    const timestampStr = data[0]?.[0] || "";
    const newTimestamp = new Date(timestampStr);

    console.log(`[REFRESH] New CSV timestamp: ${timestampStr}`);

    if (!isNaN(newTimestamp)) {
        console.log(`[REFRESH] Timestamp updated from manual refresh.`);
        lastHeaderCell = newTimestamp;
    } else {
        console.log("[REFRESH] WARNING: Timestamp invalid during manual refresh.");
    }

    matrixCache = matrix;

    broadcastUpdate(matrixCache);

    console.log("[REFRESH] Broadcast sent to all SSE clients.");

    res.json({ ok: true });
});

// --- Start server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on", PORT));

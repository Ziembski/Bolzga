const express = require('express');
const { loadMatrix, getParams, clearCache } = require('./csv');
const fetch = require('node-fetch');
const parse = require('csv-parse/lib/sync'); // <- fixed

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));

let clients = [];
let lastA1 = null;

// SSE ENDPOINT
app.get("/events", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders();

    clients.push(res);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
});

// broadcast SSE message
function broadcast(msg) {
    clients.forEach(c => c.write(`data: ${JSON.stringify(msg)}\n\n`));
}

// Check A1 every 5 seconds
async function checkA1() {
    try {
        const response = await fetch(""https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv"");
        const text = await response.text();

        const rows = parse(text, { skip_empty_lines: true });
        const A1 = rows[0][0];

        if (A1 !== lastA1) {
            lastA1 = A1;
            broadcast({ update: true });
        }
    } catch (err) {
        console.error("Error checking A1:", err);
    }
}

setInterval(checkA1, 15000);

// API: GET parameters
app.get("/api/params", async (req, res) => {
    if (!getParams()) {
        await loadMatrix();
    }
    res.json(getParams());
});

// API: force refresh
app.get("/api/refresh", async (req, res) => {
    clearCache();
    await loadMatrix();
    broadcast({ update: true });
    res.json({ ok: true });
});

app.listen(PORT, () => console.log("Server running on port", PORT));

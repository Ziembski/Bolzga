const express = require('express');
const { loadMatrix, getParams, clearCache } = require('./csv');
const fetch = require('node-fetch');
const parse = require('csv-parse');

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

async function checkA1() {
    const response = await fetch("https://docs.google.com/spreadsheets/d/TEST_ID/export?format=csv");
    const text = await response.text();
    const rows = await new Promise((resolve, reject) => {
        parse(text, {}, (err, data) => err ? reject(err) : resolve(data));
    });

    const A1 = rows[0][0];
    if (A1 !== lastA1) {
        lastA1 = A1;
        broadcast({ update: true });
    }
}

// Check every 5 seconds
setInterval(checkA1, 5000);

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

const express = require("express");
const axios = require("axios");
const cors = require("cors");
const fs = require("fs");

const app = express();
app.use(cors());
app.use(express.static("public"));

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

let clients = [];

async function fetchCSV() {
    const res = await axios.get(CSV_URL);
    const rows = res.data.trim().split("\n").map(r => r.split(","));
    let constants = {};
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < rows[r].length; c++) {
            const name = letters[c] + (r + 1);
            constants[name] = rows[r][c];
        }
    }
    fs.writeFileSync("constants.js","module.exports = " + JSON.stringify(constants, null, 2),"utf8");
    return constants;
}

let lastData = null;

setInterval(async () => {
    const fresh = await fetchCSV();
    if (JSON.stringify(fresh) !== JSON.stringify(lastData)) {
        lastData = fresh;
        clients.forEach(client => client.res.write(`data: ${JSON.stringify(fresh)}\n\n`));
    }
}, 5000);

app.get("/sse", (req, res) => {
    res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });
    res.flushHeaders();
    res.write("data: connected\n\n");
    const client = { res };
    clients.push(client);
    req.on("close", () => {
        clients = clients.filter(c => c !== client);
    });
});

app.get("/constants", async (req, res) => {
    res.json(require("./constants.js"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on " + port));

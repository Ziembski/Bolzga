const express = require("express");
const cors = require("cors");
const path = require("path");

const { fetchCSV, clearCache } = require("./utils/csv");

const app = express();
app.use(cors());
app.use(express.static("public"));

let clients = [];

async function broadcastUpdate() {
    const data = await fetchCSV();
    const payload = `data: ${JSON.stringify(data)}\n\n`;
    clients.forEach(res => res.write(payload));
}

setInterval(broadcastUpdate, 5000);

app.get("/sse", async (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*"
    });

    clients.push(res);

    const initial = await fetchCSV();
    res.write(`data: ${JSON.stringify(initial)}\n\n`);

    req.on("close", () => {
        clients = clients.filter(c => c !== res);
    });
});

app.get("/force-refresh", async (req, res) => {
    clearCache();
    await fetchCSV();
    await broadcastUpdate();
    res.send("CSV cache cleared and refreshed.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

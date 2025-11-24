const express = require("express");
const path = require("path");
const { checkForUpdates, fetchCSV } = require("./csvFetcher");

const app = express();
app.use(express.static("public"));

let clients = [];
let cachedData = null;

// SSE endpoint
app.get("/sse", async (req, res) => {
    console.log("[SSE] Client connected.");
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive"
    });

    clients.push(res);

    // Send data immediately when page loads
    const { constants } = await fetchCSV();
    res.write(`data: ${JSON.stringify(constants)}\n\n`);

    req.on("close", () => {
		console.log("[SSE] Client disconnected.");
        clients = clients.filter(c => c !== res);
    });
});

// Notify clients on CSV update
setInterval(async () => {
    const { changed, constants, table } = await checkForUpdates();
    if (changed) {
        cachedData = table;
        clients.forEach(c => c.write(`data: ${JSON.stringify(constants)}\n\n`));
    }
}, 5000);

// Serve pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

for (let i = 1; i <= 5; i++) {
    app.get(`/sub${i}`, async (req, res) => {

        console.log(`[PAGE] Subpage ${i} opened → checking CSV...`);

        const { table, constants } = await fetchCSV();

        const changed = JSON.stringify(table) !== JSON.stringify(cachedData);

        if (changed) {
            console.log(`[PAGE] CSV changed (via subpage ${i}). Updating cache + sending SSE.`);
            cachedData = table;
            clients.forEach(c => c.write(`data: ${JSON.stringify(constants)}\n\n`));
        } else {
            console.log(`[PAGE] CSV unchanged (via subpage ${i}). No SSE sent.`);
        }

        res.sendFile(path.join(__dirname, `public/sub${i}.html`));
    });
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));

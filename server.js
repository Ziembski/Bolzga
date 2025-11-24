const express = require("express");
const path = require("path");
const { checkForUpdates, fetchCSV } = require("./csvFetcher");

const app = express();
app.use(express.static("public"));

let clients = [];

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
    const { changed, constants } = await checkForUpdates();
    if (changed) {
        clients.forEach(c => c.write(`data: ${JSON.stringify(constants)}\n\n`));
    }
}, 5000);

// Serve pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "public/index.html")));

for (let i = 1; i <= 5; i++) {
    app.get(`/sub${i}`, async (req, res) => {
		
		console.log(`[PAGE] Subpage ${i} opened → forcing CSV refresh...`);
		
        // Force CSV refresh
        const { table, constants } = await fetchCSV();
		
		console.log(`[PAGE] Subpage ${i} CSV refreshed. Rows: ${table.length}`);

        // Update cache for SSE system
        cachedData = table;

        // Notify active SSE clients (optional but useful)
        clients.forEach(c => c.write(`data: ${JSON.stringify(constants)}\n\n`));

        // Serve subpage
        res.sendFile(path.join(__dirname, `public/sub${i}.html`));
    });
}
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on " + PORT));

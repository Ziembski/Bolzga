import express from "express";
import { fetchCSV, getCachedCSV, clearCache } from "./csv.js";
import { sseHandler, startCSVWatcher } from "./sse.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.static("public"));

// SSE endpoint
app.get("/events", sseHandler);

// Fetch cached or fresh param data
app.get("/api/data", async (req, res) => {
    let cache = getCachedCSV();
    if (!cache) cache = await fetchCSV();
    res.json(cache.params);
});

// Force refresh (from Aslan page button)
app.get("/api/refresh", async (req, res) => {
    clearCache();
    const data = await fetchCSV();
    res.json({ refreshed: true, params: data.params });
});

startCSVWatcher();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));

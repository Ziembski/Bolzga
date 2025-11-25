import express from "express";
import { fetchCSV, getCachedCSV, clearCache } from "./csv.js";
import { sseHandler, startCSVWatcher } from "./sse.js";
import path from "path";
import { fileURLToPath } from "url";
import { setLastFirstCell } from "./sse.js";

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
    console.log("[REFRESH] Manual CSV refresh triggered.");

    clearCache();
    console.log("[REFRESH] Cache cleared.");

    const data = await fetchCSV();

    // update lastFirstCell so SSE watch doesn't retrigger
    const firstCell = data.matrix[0][0];
    setLastFirstCell(firstCell);

    console.log(`[REFRESH] lastFirstCell updated to: ${firstCell}`);

    res.json({ refreshed: true, params: data.params });
});

startCSVWatcher();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Server running on", port));

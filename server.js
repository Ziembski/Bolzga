const express = require("express");
const cors = require("cors");
const path = require("path");

const { fetchCSV, clearCache } = require("./utils/csv");

const app = express();
app.use(cors());
app.use(express.static("public"));

// Returns current CSV values
app.get("/fetch-data", async (req, res) => {
    const data = await fetchCSV();
    res.json(data);
});

// Clears CSV cache and forces fresh reload
app.get("/force-refresh", async (req, res) => {
    clearCache();
    const fresh = await fetchCSV();
    res.json(fresh);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));

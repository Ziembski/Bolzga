const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Replace with your real sheet ID
const SHEET_ID = "YOUR_SHEET_ID_HERE";

// Public CSV export URL
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv`;

let clients = [];

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// SSE endpoint
app.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  const client = { id: Date.now(), res };
  clients.push(client);

  console.log("Client connected:", client.id);

  req.on("close", () => {
    clients = clients.filter(c => c.id !== client.id);
    console.log("Client disconnected:", client.id);
  });
});

// Broadcast function
function broadcast(data) {
  clients.forEach(client => {
    client.res.write(`data: ${JSON.stringify(data)}\n\n`);
  });
}

// Fetch Google Sheets A1 every 15 seconds
async function fetchAndBroadcast() {
  try {
    const response = await fetch(CSV_URL);
    const csv = await response.text();

    const firstLine = csv.split("\n")[0];
    const A1 = firstLine.split(",")[0];

    console.log("Fetched A1:", A1);
    broadcast({ a1: A1 });

  } catch (err) {
    console.error("Failed to fetch CSV:", err);
  }
}

// Start polling
setInterval(fetchAndBroadcast, 15000);
fetchAndBroadcast(); // Fetch immediately at startup

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

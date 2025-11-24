const express = require("express");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.static("public"));

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/xxxx/pub?output=csv";

// FNV-1a hash
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// Globals
let csvData = [];
let rowHashes = [];
let clients = [];

// Fetch CSV & detect changes
async function fetchCSV() {
  try {
    console.log("[CSV] Fetching CSV...");
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = text.trim().split("\n").map(r => r.split(","));
    const newHashes = rows.map(r => fnv1a(r.join("|")));

    let changed = false;
    for (let i = 0; i < newHashes.length; i++) {
      if (rowHashes[i] !== newHashes[i]) {
        changed = true;
        break;
      }
    }

    if (!changed) {
      console.log("[CSV] No changes detected.");
      return;
    }

    console.log("[CSV] Change detected. Updating memory & SSE.");
    csvData = rows;
    rowHashes = newHashes;

    broadcastSSE();

  } catch (err) {
    console.error("[CSV ERROR]:", err.message);
  }
}

// Generate dynamic constants A1, B1, ..., AA1, etc.
function getConstants() {
  const constants = {};
  for (let r = 0; r < csvData.length; r++) {
    for (let c = 0; c < csvData[r].length; c++) {
      const letter = columnToLetters(c);
      const key = `${letter}${r + 1}`;
      constants[key] = csvData[r][c];
    }
  }
  return constants;
}

// Helper: convert column index to letters
function columnToLetters(col) {
  let letters = "";
  col++;
  while (col > 0) {
    const rem = (col - 1) % 26;
    letters = String.fromCharCode(65 + rem) + letters;
    col = Math.floor((col - 1) / 26);
  }
  return letters;
}

// SSE broadcast
function broadcastSSE() {
  const data = JSON.stringify(getConstants());
  console.log("[SSE] Broadcasting update...");
  clients.forEach(res => res.write(`data: ${data}\n\n`));
}

// SSE endpoint
app.get("/events", (req, res) => {
  console.log("[SSE] Client connected");
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    console.log("[SSE] Client disconnected");
    clients = clients.filter(c => c !== res);
  });
});

// Main page
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public", "index.html"))
);

// Force CSV fetch manually
app.get("/fetch-now", async (req, res) => {
  console.log("[CSV] Manual fetch requested");
  await fetchCSV();
  res.json({ status: "ok" });
});

// Subpages (row-specific)
app.get("/sub/:row", (req, res) =>
  res.sendFile(path.join(__dirname, "public", `sub${req.params.row}.html`))
);

// Timer to fetch CSV every 5s
setInterval(fetchCSV, 5000);
fetchCSV();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));

// server.js
const express = require("express");
const fs = require("fs");
const fetch = require("node-fetch");
const path = require("path");

const app = express();
app.use(express.static("public"));

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

// ====== FAST FNV-1a HASH ======
function fnv1a(str) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }
  return hash >>> 0;
}

// ====== GLOBAL CACHE ======
let csvData = [];         // 2D array
let rowHashes = [];       // Hash per row: [hash1, hash2, ...]
let lastUpdate = 0;       // Timestamp of last CSV fetch
let isThrottled = false;  // Prevent multiple fetches from burst loads

// ====== THROTTLED CSV FETCH (1 fetch per 1s max) ======
async function throttledFetchCSV() {
  if (isThrottled) {
    console.log("[THROTTLE] Fetch skipped");
    return false;
  }

  isThrottled = true;
  setTimeout(() => (isThrottled = false), 1000);

  return await fetchCSV();
}

// ====== DOWNLOAD CSV & DETECT PARTIAL CHANGES ======
async function fetchCSV() {
  console.log("[CSV] Fetching CSV...");

  const response = await fetch(CSV_URL);
  const text = await response.text();

  const rows = text
    .trim()
    .split("\n")
    .map((r) => r.split(","));

  const newRowHashes = rows.map((r) => fnv1a(r.join("|")));
  let changed = false;

  // Compare old vs new row hashes
  for (let i = 0; i < newRowHashes.length; i++) {
    if (rowHashes[i] !== newRowHashes[i]) {
      changed = true;
      break;
    }
  }

  if (!changed) {
    console.log("[CSV] No changes detected.");
    return false;
  }

  console.log("[CSV] Change detected — updating memory.");

  csvData = rows;
  rowHashes = newRowHashes;
  lastUpdate = Date.now();

  broadcastSSE();

  return true;
}

// Initial CSV load
fetchCSV();

// ====== GENERATE CONSTANTS A1–E5 ONLY ======
function getConstants() {
  const constants = {};

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const letter = String.fromCharCode(65 + col); // A–E
      const cellName = `${letter}${row + 1}`;
      constants[cellName] = csvData[row]?.[col] ?? "";
    }
  }

  return constants;
}

// ====== SSE CLIENTS ======
let clients = [];

function broadcastSSE() {
  const constants = getConstants();
  const json = JSON.stringify(constants);

  console.log("[SSE] Broadcasting update...");

  clients.forEach((res) => res.write(`data: ${json}\n\n`));
}

app.get("/events", (req, res) => {
  console.log("[SSE] Client connected.");

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  clients.push(res);

  req.on("close", () => {
    console.log("[SSE] Client disconnected.");
    clients = clients.filter((c) => c !== res);
  });
});

// ====== ROUTE: SERVE SUBPAGES & TRIGGER THROTTLED FETCH ======
app.get("/sub/:id", async (req, res) => {
  const id = Number(req.params.id);

  await throttledFetchCSV();

  res.sendFile(path.join(__dirname, "public", `sub${id}.html`));
});

// ====== MAIN PAGE ======
app.get("/", async (req, res) => {
  await throttledFetchCSV();
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ====== START SERVER ======
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port", PORT));

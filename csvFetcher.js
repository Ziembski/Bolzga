const fetch = (...args) => import('node-fetch').then(({default: fetch }) => fetch(...args));
const { parse } = require("csv-parse/sync");

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

let cachedData = null;

async function fetchCSV() {
    console.log("[CSV] Fetching CSV from Google Sheets...");

    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = parse(text);

    console.log(`[CSV] Retrieved ${rows.length} rows.`);

    const table = rows;

    const constants = {};
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    table.forEach((row, r) => {
        row.forEach((cell, c) => {
            const name = letters[c] + (r + 1);
            constants[name] = cell;
        });
    });

    console.log("[CSV] Constants generated:", Object.keys(constants).length, "cells");

    return { table, constants };
}

async function checkForUpdates() {
    console.log("[CSV] Checking for updates...");

    const { table, constants } = await fetchCSV();
    const changed = JSON.stringify(table) !== JSON.stringify(cachedData);

    if (changed) {
        console.log("[CSV] CHANGE DETECTED — broadcasting SSE update.");
    } else {
        console.log("[CSV] No change.");
    }

    cachedData = table;
    return { changed, table, constants };
}

module.exports = { fetchCSV, checkForUpdates };

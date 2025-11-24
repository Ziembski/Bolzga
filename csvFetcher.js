const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { parse } = require("csv-parse/sync");

const CSV_URL = "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/export?format=csv";

let cachedData = null;

async function fetchCSV() {
    const res = await fetch(CSV_URL);
    const text = await res.text();
    const rows = parse(text);

    // Build 2D array
    const table = rows;

    // Build spreadsheet constants (A1, B1...)
    const constants = {};
    const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

    table.forEach((row, r) => {
        row.forEach((cell, c) => {
            const name = letters[c] + (r + 1);
            constants[name] = cell;
        });
    });

    return { table, constants };
}

async function checkForUpdates() {
    const { table, constants } = await fetchCSV();
    const changed = JSON.stringify(table) !== JSON.stringify(cachedData);
    cachedData = table;
    return { changed, table, constants };
}

module.exports = { fetchCSV, checkForUpdates };

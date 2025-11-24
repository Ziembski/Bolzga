const fetch = require('node-fetch');
const parse = require('csv-parse');

let cachedMatrix = null;
let cachedParams = null;

// PUBLIC CSV EXAMPLE — replace with your sheet
const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

async function fetchCSV() {
    const response = await fetch(CSV_URL);
    const text = await response.text();

    return new Promise((resolve, reject) => {
        parse(text, {}, (err, rows) => {
            if (err) reject(err);
            resolve(rows);
        });
    });
}

async function loadMatrix() {
    const rows = await fetchCSV();

    const header = rows[0];   // First row = parameter names
    const matrix = rows.slice(1);

    // Build param dictionary:
    // "Imię_1" → value from row 1 under "Imię"
    let params = {};
    matrix.forEach((row, rowIndex) => {
        header.forEach((colName, colIndex) => {
            const paramKey = `${colName}_${rowIndex + 1}`;
            params[paramKey] = row[colIndex];
        });
    });

    cachedMatrix = matrix;
    cachedParams = params;

    return { matrix, params };
}

function getParams() {
    return cachedParams;
}

function clearCache() {
    cachedMatrix = null;
    cachedParams = null;
}

module.exports = { loadMatrix, getParams, clearCache };

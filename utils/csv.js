const fetch = require("node-fetch");
const { parse } = require("csv-parse/sync");

let cachedData = null;
let cachedString = "";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

async function fetchCSV() {
    const res = await fetch(CSV_URL);
    const csvText = await res.text();

    if (csvText === cachedString) return cachedData;

    const rows = parse(csvText, { delimiter: "," });
    const header = rows[0];

    const matrix = rows.slice(1);

    let dataObj = {};

    matrix.forEach((row, rowIndex) => {
        header.forEach((colName, colIndex) => {
            const key = `${colName}_${rowIndex + 1}`;
            dataObj[key] = row[colIndex];
        });
    });

    cachedString = csvText;
    cachedData = dataObj;

    return cachedData;
}

function clearCache() {
    cachedData = null;
    cachedString = "";
}

module.exports = { fetchCSV, clearCache };

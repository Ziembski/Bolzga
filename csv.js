import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import fs from "fs";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";
const CACHE_FILE = "./utils/csvCache.json";

export async function fetchCSV() {
    const response = await fetch(CSV_URL);
    const text = await response.text();

    const rows = parse(text, { delimiter: ",", relax_quotes: true });

    const header = rows[0];
    const matrix = rows.slice(1);

    const params = {};
    for (let col = 0; col < header.length; col++) {
        const colName = header[col];
        for (let row = 0; row < matrix.length; row++) {
            params[`${colName}_${row + 1}`] = matrix[row][col];
        }
    }

    const data = { header, matrix, params };

    fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));

    return data;
}

export function getCachedCSV() {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf-8"));
}

export function clearCache() {
    if (fs.existsSync(CACHE_FILE)) fs.unlinkSync(CACHE_FILE);
}

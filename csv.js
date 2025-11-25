import fetch from "node-fetch";
import { parse } from "csv-parse/sync";
import fs from "fs";

const CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv";

export async function fetchCSV() {
    const res = await fetch(CSV_URL);
    const csvText = await res.text();

    const rows = parse(csvText, { skip_empty_lines: true });

    const headers = rows[0];
    const data = rows.slice(1);

    const matrix = {};

    headers.forEach((header, colIndex) => {
        data.forEach((row, rowIndex) => {
            const key = `${header}_${rowIndex + 1}`;
            matrix[key] = row[colIndex];
        });
    });

    return { headers, data, matrix };
}

export function clearCache() {
    if (fs.existsSync("./data/cache.json")) {
        fs.unlinkSync("./data/cache.json");
    }
}

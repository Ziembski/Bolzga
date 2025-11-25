const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Store the current data in memory
let currentData = {
  headers: [],
  rows: [],
  lastTimestamp: null
};

// SSE clients tracking
let sseClients = [];

// Google Sheets CSV URL - Replace with your actual public CSV URL
const SHEETS_CSV_URL = process.env.SHEETS_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv';

/**
 * Parse CSV text into an array of rows and columns
 * This handles basic CSV parsing including quoted fields
 */
function parseCSV(text) {
  const lines = text.split('\n').filter(line => line.trim());
  const result = [];
  
  for (let line of lines) {
    const row = [];
    let currentField = '';
    let insideQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        row.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    
    row.push(currentField.trim());
    result.push(row);
  }
  
  return result;
}

/**
 * Fetch data from Google Sheets CSV and process it
 * Creates indexed parameters like "Imię_1", "Nazwisko_1", etc.
 */
async function fetchSheetData() {
  try {
    const response = await fetch(SHEETS_CSV_URL);
    const text = await response.text();
    const parsed = parseCSV(text);
    
    if (parsed.length === 0) {
      throw new Error('No data found in CSV');
    }
    
    // First row contains headers
    const headers = parsed[0];
    // Remaining rows contain data
    const dataRows = parsed.slice(1);
    
    // Get timestamp from first cell (assuming it's in the first column)
    const newTimestamp = dataRows.length > 0 ? dataRows[0][0] : null;
    
    return {
      headers,
      rows: dataRows,
      lastTimestamp: newTimestamp
    };
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

/**
 * Update the current data and notify all SSE clients
 * This is called when data changes are detected
 */
async function updateData() {
  const newData = await fetchSheetData();
  
  // Check if timestamp has changed (data update detection)
  if (newData.lastTimestamp !== currentData.lastTimestamp) {
    currentData = newData;
    
    // Notify all connected SSE clients
    sseClients.forEach(client => {
      client.res.write(`data: ${JSON.stringify(currentData)}\n\n`);
    });
    
    console.log('Data updated at:', new Date().toISOString());
  }
}

// Serve static files from public directory
app.use(express.static('public'));

/**
 * API endpoint to get current data
 * Returns headers and all rows with indexed parameters
 */
app.get('/api/data', async (req, res) => {
  try {
    if (currentData.rows.length === 0) {
      await updateData();
    }
    res.json(currentData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * API endpoint to force refresh data
 * Clears current data and fetches fresh from Google Sheets
 */
app.get('/api/refresh', async (req, res) => {
  try {
    currentData = {
      headers: [],
      rows: [],
      lastTimestamp: null
    };
    
    await updateData();
    res.json({ success: true, data: currentData });
  } catch (error) {
    res.status(500).json({ error: 'Failed to refresh data' });
  }
});

/**
 * SSE endpoint for real-time updates
 * Clients connect here to receive automatic updates when data changes
 */
app.get('/api/sse', (req, res) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Add this client to the list
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  
  sseClients.push(newClient);
  
  // Send initial data
  res.write(`data: ${JSON.stringify(currentData)}\n\n`);
  
  // Remove client on connection close
  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
  });
});

// Initial data load when server starts
fetchSheetData().then(data => {
  currentData = data;
  console.log('Initial data loaded');
}).catch(err => {
  console.error('Failed to load initial data:', err);
});

// Check for updates every 10 seconds
setInterval(updateData, 10000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
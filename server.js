const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Path to local CSV file
const LOCAL_CSV_PATH = path.join(__dirname, 'data.csv');

// Store the current data in memory
let currentData = {
  headers: [],
  rows: [],
  lastTimestamp: null
};

// SSE clients tracking
let sseClients = [];

// Google Sheets CSV URL
const SHEETS_CSV_URL = process.env.SHEETS_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS86NCiI89lss8zi8Z1K1GHRyQmUvQqFCWnPOdXGzrWUUsadr7hif9lLfc4vI1b3A/pub?gid=1665360733&single=true&output=csv';

// Middleware to parse JSON bodies
app.use(express.json());

/**
 * Parse CSV text into an array of rows and columns
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
 * Convert data structure back to CSV text
 */
function dataToCSV(data) {
  const allRows = [data.headers, ...data.rows];
  
  return allRows.map(row => {
    return row.map(cell => {
      const cellStr = String(cell);
      // Escape quotes and wrap in quotes if contains comma, quote, or newline
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return '"' + cellStr.replace(/"/g, '""') + '"';
      }
      return cellStr;
    }).join(',');
  }).join('\n');
}

/**
 * Load data from local CSV file
 */
async function loadLocalCSV() {
  try {
    const text = await fs.readFile(LOCAL_CSV_PATH, 'utf-8');
    const parsed = parseCSV(text);
    
    if (parsed.length === 0) {
      throw new Error('No data found in local CSV');
    }
    
    const headers = parsed[0];
    const dataRows = parsed.slice(1);
    const newTimestamp = dataRows.length > 0 ? dataRows[0][0] : null;
    
    return {
      headers,
      rows: dataRows,
      lastTimestamp: newTimestamp
    };
  } catch (error) {
    console.error('Error loading local CSV:', error);
    throw error;
  }
}

/**
 * Save current data to local CSV file
 */
async function saveLocalCSV(data) {
  try {
    const csvText = dataToCSV(data);
    await fs.writeFile(LOCAL_CSV_PATH, csvText, 'utf-8');
    console.log('Local CSV saved successfully');
  } catch (error) {
    console.error('Error saving local CSV:', error);
    throw error;
  }
}

/**
 * Fetch data from Google Sheets CSV
 */
async function fetchGoogleSheetData() {
  try {
    const response = await fetch(SHEETS_CSV_URL);
    const text = await response.text();
    const parsed = parseCSV(text);
    
    if (parsed.length === 0) {
      throw new Error('No data found in Google CSV');
    }
    
    const headers = parsed[0];
    const dataRows = parsed.slice(1);
    const newTimestamp = dataRows.length > 0 ? dataRows[0][0] : null;
    
    return {
      headers,
      rows: dataRows,
      lastTimestamp: newTimestamp
    };
  } catch (error) {
    console.error('Error fetching Google Sheet data:', error);
    throw error;
  }
}

/**
 * Sync from Google Sheets - overwrites local CSV
 */
async function syncFromGoogle() {
  try {
    console.log('Syncing from Google Sheets...');
    const newData = await fetchGoogleSheetData();
    
    // Save to local file
    await saveLocalCSV(newData);
    
    // Update in-memory data
    currentData = newData;
    
    // Notify all SSE clients
    notifyAllClients();
    
    console.log('Sync from Google completed. New timestamp:', newData.lastTimestamp);
    return { success: true, timestamp: newData.lastTimestamp };
  } catch (error) {
    console.error('Error syncing from Google:', error);
    throw error;
  }
}

/**
 * Update timestamp in first column of a specific row
 * @param {number} rowIndex - 1-based row number (excluding header)
 */
function updateRowTimestamp(rowIndex) {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  const timestamp = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  
  // Update first column (index 0) of the specified row
  if (rowIndex >= 1 && rowIndex <= currentData.rows.length) {
    currentData.rows[rowIndex - 1][0] = timestamp;
    
    // Also update lastTimestamp if this is the first data row
    if (rowIndex === 1) {
      currentData.lastTimestamp = timestamp;
    }
  }
  
  return timestamp;
}

/**
 * Modify a cell value by adding/subtracting a delta
 * @param {number} rowIndex - 1-based row number (excluding header)
 * @param {string} fieldName - Column header name
 * @param {number} delta - Amount to add (positive) or subtract (negative)
 */
async function modifyCSVValue(rowIndex, fieldName, delta) {
  try {
    // Validate row index
    if (rowIndex < 1 || rowIndex > currentData.rows.length) {
      throw new Error(`Invalid row index: ${rowIndex}. Must be between 1 and ${currentData.rows.length}`);
    }
    
    // Find column index
    const columnIndex = currentData.headers.indexOf(fieldName);
    if (columnIndex === -1) {
      throw new Error(`Field "${fieldName}" not found in headers`);
    }
    
    // Get current value
    const row = currentData.rows[rowIndex - 1];
    const currentValue = parseFloat(row[columnIndex]) || 0;
    
    // Calculate new value
    const newValue = currentValue + delta;
    
    // Update in-memory data
    currentData.rows[rowIndex - 1][columnIndex] = String(newValue);
    
    // Update timestamp in first column
    const newTimestamp = updateRowTimestamp(rowIndex);
    
    // Save to file
    await saveLocalCSV(currentData);
    
    // Notify all SSE clients
    notifyAllClients();
    
    console.log(`Modified row ${rowIndex}, field "${fieldName}": ${currentValue} → ${newValue} (${delta >= 0 ? '+' : ''}${delta}), timestamp updated to ${newTimestamp}`);
    
    return {
      success: true,
      row: rowIndex,
      field: fieldName,
      oldValue: currentValue,
      newValue: newValue,
      delta: delta,
      timestamp: newTimestamp
    };
  } catch (error) {
    console.error('Error modifying CSV value:', error);
    throw error;
  }
}

/**
 * Notify all connected SSE clients of data update
 */
function notifyAllClients() {
  sseClients.forEach(client => {
    try {
      client.res.write(`data: ${JSON.stringify(currentData)}\n\n`);
    } catch (error) {
      console.error('Error notifying client:', error);
    }
  });
  console.log(`Notified ${sseClients.length} SSE clients`);
}

// Serve static files from public directory
app.use(express.static('public'));

/**
 * API endpoint to get current data
 * This is what HTML pages call - no changes needed to HTML!
 */
app.get('/api/data', async (req, res) => {
  try {
    res.json(currentData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch data' });
  }
});

/**
 * API endpoint to force refresh data from local file
 * HTML pages can still call this - behavior unchanged
 */
app.get('/api/refresh', async (req, res) => {
  try {
    // Reload from local file (in case it was modified externally)
    const reloadedData = await loadLocalCSV();
    currentData = reloadedData;
    
    // Notify all clients
    notifyAllClients();
    
    res.json({ 
      success: true, 
      updated: true,
      data: currentData,
      message: 'Data reloaded from local CSV'
    });
  } catch (error) {
    console.error('Refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh data' });
  }
});

/**
 * NEW: API endpoint to sync from Google Sheets
 * Call this when you want to overwrite local CSV with Google data
 * GET /api/sync-from-google
 */
app.get('/api/sync-from-google', async (req, res) => {
  try {
    const result = await syncFromGoogle();
    res.json({
      success: true,
      message: 'Successfully synced from Google Sheets',
      timestamp: result.timestamp,
      rowCount: currentData.rows.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      error: 'Failed to sync from Google Sheets',
      details: error.message 
    });
  }
});

/**
 * NEW: API endpoint to modify a cell value
 * POST /api/modify
 * Body: { "row": 5, "field": "Kapsle", "delta": 1 }
 * OR
 * GET /api/modify?row=5&field=Kapsle&delta=1
 */
app.post('/api/modify', async (req, res) => {
  try {
    const { row, field, delta } = req.body;
    
    if (!row || !field || delta === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: row, field, delta'
      });
    }
    
    const result = await modifyCSVValue(
      parseInt(row),
      field,
      parseFloat(delta)
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Also support GET for modify (easier for quick testing)
app.get('/api/modify', async (req, res) => {
  try {
    const { row, field, delta } = req.query;
    
    if (!row || !field || delta === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: row, field, delta'
      });
    }
    
    const result = await modifyCSVValue(
      parseInt(row),
      field,
      parseFloat(delta)
    );
    
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * SSE endpoint for real-time updates
 * HTML pages connect here - no changes needed!
 */
app.get('/api/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res
  };
  
  sseClients.push(newClient);
  
  // Send initial data
  res.write(`data: ${JSON.stringify(currentData)}\n\n`);
  
  req.on('close', () => {
    sseClients = sseClients.filter(client => client.id !== clientId);
    console.log(`SSE client ${clientId} disconnected. Active clients: ${sseClients.length}`);
  });
  
  console.log(`SSE client ${clientId} connected. Active clients: ${sseClients.length}`);
});

/**
 * Initialize server - load or create local CSV
 */
async function initializeServer() {
  try {
    // Try to load existing local CSV
    currentData = await loadLocalCSV();
    console.log('Loaded existing local CSV with timestamp:', currentData.lastTimestamp);
  } catch (error) {
    console.log('Local CSV not found, syncing from Google Sheets...');
    try {
      await syncFromGoogle();
      console.log('Initial sync from Google completed');
    } catch (syncError) {
      console.error('Failed to sync from Google on startup:', syncError);
      console.error('Server will start but data may be unavailable');
    }
  }
}

// Start server
initializeServer().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log('API Endpoints:');
    console.log('  GET  /api/data - Get current data');
    console.log('  GET  /api/refresh - Reload from local CSV');
    console.log('  GET  /api/sse - Server-Sent Events for real-time updates');
    console.log('  GET  /api/sync-from-google - Overwrite local CSV with Google Sheets data');
    console.log('  POST /api/modify - Modify a cell value (body: {row, field, delta})');
    console.log('  GET  /api/modify?row=X&field=Y&delta=Z - Modify a cell value');
  });
}).catch(error => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
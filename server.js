const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

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
 * Parse timestamp string in format "YYYY-MM-DD hh:mm:ss" to Date object
 * Returns null if parsing fails
 */
function parseTimestamp(timestampStr) {
  if (!timestampStr || typeof timestampStr !== 'string') {
    return null;
  }
  
  // Remove quotes if present
  const cleanStr = timestampStr.replace(/['"]/g, '').trim();
  
  // Parse "YYYY-MM-DD hh:mm:ss" format
  const regex = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = cleanStr.match(regex);
  
  if (!match) {
    console.warn('Timestamp format does not match YYYY-MM-DD hh:mm:ss:', cleanStr);
    return null;
  }
  
  const [, year, month, day, hour, minute, second] = match;
  
  // Create date object (month is 0-indexed in JavaScript)
  const date = new Date(
    parseInt(year),
    parseInt(month) - 1,
    parseInt(day),
    parseInt(hour),
    parseInt(minute),
    parseInt(second)
  );
  
  // Validate date
  if (isNaN(date.getTime())) {
    console.warn('Invalid date created from timestamp:', cleanStr);
    return null;
  }
  
  return date;
}

/**
 * Compare two timestamps and return true if newTimestamp is newer
 */
function isNewerTimestamp(newTimestampStr, oldTimestampStr) {
  // If no old timestamp, consider new one as newer
  if (!oldTimestampStr) {
    return true;
  }
  
  const newDate = parseTimestamp(newTimestampStr);
  const oldDate = parseTimestamp(oldTimestampStr);
  
  // If we can't parse new timestamp, don't update
  if (!newDate) {
    console.warn('Cannot parse new timestamp, skipping update');
    return false;
  }
  
  // If we can't parse old timestamp, consider new one as newer
  if (!oldDate) {
    return true;
  }
  
  // Compare timestamps
  const isNewer = newDate.getTime() > oldDate.getTime();
  
  if (isNewer) {
    console.log('New timestamp is newer:', {
      old: oldTimestampStr,
      new: newTimestampStr,
      oldDate: oldDate.toISOString(),
      newDate: newDate.toISOString()
    });
  } else {
    console.log('New timestamp is NOT newer, skipping update:', {
      old: oldTimestampStr,
      new: newTimestampStr
    });
  }
  
  return isNewer;
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
    
    // Get timestamp from first cell of first data row (assuming it's in the first column)
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
 * Only updates if the new timestamp is actually newer
 */
async function updateData() {
  try {
    const newData = await fetchSheetData();
    
    // Check if timestamp has changed AND is newer than the current one
    if (isNewerTimestamp(newData.lastTimestamp, currentData.lastTimestamp)) {
      currentData = newData;
      
      // Notify all connected SSE clients
      sseClients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(currentData)}\n\n`);
      });
      
      console.log('Data updated at:', new Date().toISOString(), 'with timestamp:', newData.lastTimestamp);
    } else {
      console.log('No update needed - timestamp is not newer');
    }
  } catch (error) {
    console.error('Error in updateData:', error);
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
 * Fetches fresh from Google Sheets but only updates if timestamp is newer
 */
app.get('/api/refresh', async (req, res) => {
  try {
    const oldTimestamp = currentData.lastTimestamp;
    
    // Fetch fresh data from Google Sheets
    const newData = await fetchSheetData();
    
    // Check if timestamp is actually newer
    if (isNewerTimestamp(newData.lastTimestamp, oldTimestamp)) {
      currentData = newData;
      
      // Notify all connected SSE clients about the manual update
      sseClients.forEach(client => {
        client.res.write(`data: ${JSON.stringify(currentData)}\n\n`);
      });
      
      console.log('Manual refresh: Data updated. Old timestamp:', oldTimestamp, 'New timestamp:', currentData.lastTimestamp);
      
      res.json({ 
        success: true, 
        updated: true,
        data: currentData,
        message: 'Data has been updated with newer timestamp'
      });
    } else {
      console.log('Manual refresh: No update - timestamp is not newer. Current:', oldTimestamp, 'Fetched:', newData.lastTimestamp);
      
      res.json({ 
        success: true, 
        updated: false,
        data: currentData,
        message: 'No update needed - data is already current'
      });
    }
  } catch (error) {
    console.error('Manual refresh error:', error);
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
    console.log(`SSE client ${clientId} disconnected. Active clients: ${sseClients.length}`);
  });
  
  console.log(`SSE client ${clientId} connected. Active clients: ${sseClients.length}`);
});

// Initial data load when server starts
fetchSheetData().then(data => {
  currentData = data;
  console.log('Initial data loaded with timestamp:', data.lastTimestamp);
}).catch(err => {
  console.error('Failed to load initial data:', err);
});

// Check for updates every 10 seconds
setInterval(updateData, 10000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Timestamp format expected: YYYY-MM-DD hh:mm:ss`);
});
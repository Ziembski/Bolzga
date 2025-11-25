# Google Sheets Dynamic Display

A Node.js web application that displays Google Sheets data dynamically with real-time updates via Server-Sent Events (SSE).

## Features

- Fetches data from public Google Sheets CSV
- Real-time updates every 10 seconds
- Server-Sent Events for instant updates
- Debounced updates to prevent rapid re-renders
- Manual refresh capability
- Responsive design
- Easy template replication

## Setup for Render.com

1. Create a new Web Service on Render.com
2. Connect your GitHub repository
3. Set the following:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add environment variable:
   - Key: `SHEETS_CSV_URL`
   - Value: Your Google Sheets public CSV URL

## Getting Your Google Sheets CSV URL

1. Open your Google Sheet
2. Click File → Share → Publish to web
3. Select "Comma-separated values (.csv)"
4. Copy the generated URL
5. Use this URL in the environment variable

## Local Development

```bash
npm install
export SHEETS_CSV_URL="your_csv_url_here"
npm start
```

Visit `http://localhost:3000`

## Adding New Template Pages

The template.html file is designed to be reusable. Simply link to it with different row parameters:

```html
Entry 1
Entry 2
```

No code modifications needed!

## CSV Format

Your CSV should have:
- First row: Headers (e.g., Imię, Nazwisko, Wiek, Płeć, Rasa)
- First column of data rows: Timestamp for change detection
- Data rows: Your actual data

Example:
```
Timestamp,Imię,Nazwisko,Wiek,Płeć,Rasa
2024-01-01 10:00:00,Jan,Kowalski,25,M,Człowiek
2024-01-01 10:05:00,Anna,Nowak,30,K,Elf
```
```
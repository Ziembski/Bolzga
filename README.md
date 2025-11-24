# CSV SSE App for Render.com

This app fetches a Google Sheets CSV, converts it into spreadsheet-style
constants (A1, B1, C1...), and updates 5 HTML subpages via SSE whenever
the CSV changes.

## Deploy on Render

1. Push to GitHub  
2. Create new Web Service  
3. Set build command: *(none)*  
4. Set start command: `node server.js`  
5. Deploy

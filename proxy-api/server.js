const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjJqzzGyEd1Jm6kq32BXUEl-2ZGEQY2WwpqJjhAQtYKl98_wOo8FFkMUzYKLxCK0noVA/exec';

// Main endpoint - serve the HTML with modified script URLs
app.get('/', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    let html = await response.text();
    
    // Modify the HTML to make google.script.run work through proxy
    // Replace google.script.run calls to go through our proxy
    html = html.replace(
      /google\.script\.run/g,
      'window.parent.google.script.run'
    );
    
    // Add a script to redirect google.script calls
    const proxyScript = `
    <script>
      // Forward google.script.run calls to the real Apps Script
      window.google = window.google || {};
      window.google.script = window.google.script || {};
      window.google.script.run = {
        withSuccessHandler: function(callback) {
          return {
            withFailureHandler: function(errorCallback) {
              return {
                saveMarks: function(block, subject, marksData, lecturerName) {
                  fetch('/api/saveMarks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ block, subject, marksData, lecturerName })
                  })
                  .then(r => r.json())
                  .then(data => callback(data))
                  .catch(e => errorCallback(e));
                },
                getMarks: function(block, subject) {
                  fetch('/api/getMarks?block=' + block + '&subject=' + subject)
                    .then(r => r.json())
                    .then(data => callback(data))
                    .catch(e => errorCallback(e));
                }
              };
            }
          };
        }
      };
    </script>
    `;
    
    // Insert the proxy script into the HTML
    html = html.replace('</head>', proxyScript + '</head>');
    
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// API endpoints to handle google.script.run calls
app.post('/api/saveMarks', async (req, res) => {
  try {
    const { block, subject, marksData, lecturerName } = req.body;
    // Forward to real Apps Script
    const response = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'saveMarks', block, subject, marksData, lecturerName })
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/getMarks', async (req, res) => {
  try {
    const { block, subject } = req.query;
    const response = await fetch(`${APPS_SCRIPT_URL}?action=getMarks&block=${block}&subject=${subject}`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

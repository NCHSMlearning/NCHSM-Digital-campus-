const express = require('express');
const fetch = require('node-fetch');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const APPS_SCRIPT_BASE = 'https://script.google.com';
const APPS_SCRIPT_PATH = '/macros/s/AKfycbzjJqzzGyEd1Jm6kq32BXUEl-2ZGEQY2WwpqJjhAQtYKl98_wOo8FFkMUzYKLxCK0noVA/exec';

// Helper to forward requests
async function forwardRequest(req, res, targetUrl) {
  try {
    console.log('Proxying:', targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': req.headers.accept || '*/*',
        'Accept-Language': 'en-US,en;q=0.9'
      }
    });
    
    const body = await response.text();
    
    // For HTML, fix resource paths
    if (response.headers.get('content-type')?.includes('text/html')) {
      let modified = body;
      // Fix relative URLs to absolute
      modified = modified.replace(/(src|href)=["']\/([^"']+)["']/g, `$1="https://script.google.com/$2"`);
      modified = modified.replace(/(src|href)=["'](?!https?:\/\/)([^"']+)["']/g, `$1="https://script.google.com/macros/s/AKfycbzjJqzzGyEd1Jm6kq32BXUEl-2ZGEQY2WwpqJjhAQtYKl98_wOo8FFkMUzYKLxCK0noVA/exec/$2"`);
      res.send(modified);
    } else {
      res.set('Content-Type', response.headers.get('content-type'));
      res.send(body);
    }
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
}

// Handle all requests
app.use(async (req, res) => {
  // If requesting static assets, forward to Google
  if (req.path.includes('/static/') || req.path.includes('/macros/')) {
    const targetUrl = APPS_SCRIPT_BASE + req.originalUrl;
    await forwardRequest(req, res, targetUrl);
  } else {
    // Main page request
    await forwardRequest(req, res, APPS_SCRIPT_BASE + APPS_SCRIPT_PATH);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

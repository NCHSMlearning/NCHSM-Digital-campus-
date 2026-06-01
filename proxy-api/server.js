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

// Helper to get correct MIME type
function getMimeType(path) {
  if (path.endsWith('.css')) return 'text/css';
  if (path.endsWith('.js')) return 'application/javascript';
  if (path.endsWith('.json')) return 'application/json';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.ttf')) return 'font/ttf';
  return 'text/html';
}

// Forward request with proper MIME types
async function forwardRequest(req, res, targetUrl, contentType) {
  try {
    console.log('Proxying:', targetUrl);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': req.headers.accept || '*/*'
      }
    });
    
    const body = await response.text();
    const mimeType = getMimeType(req.path);
    
    res.set('Content-Type', mimeType);
    res.send(body);
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).send(`Error: ${error.message}`);
  }
}

// Handle static assets (CSS, JS, etc.)
app.get('/static/*', async (req, res) => {
  const targetUrl = APPS_SCRIPT_BASE + req.originalUrl;
  await forwardRequest(req, res, targetUrl);
});

app.get('/macros/*', async (req, res) => {
  const targetUrl = APPS_SCRIPT_BASE + req.originalUrl;
  await forwardRequest(req, res, targetUrl);
});

// Main page
app.get('/', async (req, res) => {
  await forwardRequest(req, res, APPS_SCRIPT_BASE + APPS_SCRIPT_PATH);
});

// Catch all - handle any other routes
app.get('*', async (req, res) => {
  await forwardRequest(req, res, APPS_SCRIPT_BASE + APPS_SCRIPT_PATH);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

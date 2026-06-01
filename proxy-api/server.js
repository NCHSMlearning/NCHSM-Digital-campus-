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

// Test endpoint
app.get('/test', (req, res) => {
  res.send('Proxy is working!');
});

// Main endpoint
app.get('/', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const html = await response.text();
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// Catch all - handle any other routes
app.get('*', async (req, res) => {
  try {
    const response = await fetch(APPS_SCRIPT_URL);
    const html = await response.text();
    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Proxy running on port ${PORT}`));

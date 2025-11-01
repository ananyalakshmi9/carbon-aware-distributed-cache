const express = require('express');
const cache = require('./cache'); // Import our cache

const app = express();

// SCRUM-13: GET /v1/cache/:key
app.get('/v1/cache/:key', (req, res) => {
  const { key } = req.params;
  const value = cache.get(key); // get() handles all expiry logic

  if (value !== null) {
    res.status(200).send(value);
  } else {
    res.status(404).send({ error: 'Key not found or expired' });
  }
});

// SCRUM-14: DELETE /v1/cache/:key
app.delete('/v1/cache/:key', (req, res) => {
  const { key } = req.params;

  if (cache.has(key)) {
    cache.delete(key);
    res.status(204).send();
  } else {
    res.status(404).send({ error: 'Key not found' });
  }
});

// Export the app for testing
module.exports = app;
const express = require('express');
const cache = require('./cache'); // Import our cache

const app = express();

// --- Middleware ---
// This middleware is new. It's needed to read the "binary/octet-stream" body
// as defined in the SAD
app.use(express.raw({
  type: 'binary/octet-stream',
  limit: '10mb' // Set a limit for the cache value size
}));


// ===========================================
// NEW: SCRUM-XX (Store/Update a Key)
// ===========================================
// This implements the PUT route from the SAD document
app.put('/v1/cache/:key', (req, res) => {
  const { key } = req.params;
  
  // Get ttl from query parameters [cite: 116]
  const { ttl } = req.query; 
  
  // Get value from the request body [cite: 116]
  // The 'express.raw()' middleware puts it in 'req.body' as a Buffer
  const value = req.body; 

  if (!Buffer.isBuffer(value) || value.length === 0) {
    // 400 Bad Request if the body is empty
    return res.status(400).send({ error: 'Request body must be a non-empty value.' });
  }

  // Check if key already exists to return 200 vs 201
  const keyExists = cache.has(key);

  // Store the data (convert Buffer to string for storage)
  // We pass 'ttl' as-is; cache.set() will handle it if it's undefined
  cache.set(key, value.toString(), ttl); 

  if (keyExists) {
    // 200 OK: If an existing key was updated [cite: 117]
    res.status(200).send({ message: 'Key updated.' });
  } else {
    // 201 Created: If the key was newly created [cite: 117]
    res.status(201).send({ message: 'Key created.' });
  }
});


// ===========================================
// SCRUM-13: Retrieve a value by its key
// ===========================================
// This route is correct as-is 
app.get('/v1/cache/:key', (req, res) => {
  const { key } = req.params;
  const value = cache.get(key); // cache.get() handles all expiry logic

  if (value !== null) {
    // 200 OK: With the value in the response body [cite: 124]
    res.status(200).send(value);
  } else {
    // 404 Not Found: If the key does not exist or has expired [cite: 125]
    res.status(404).send({ error: 'Key not found or expired' });
  }
});

// ===========================================
// SCRUM-14: Manually delete a key
// ===========================================
// This route is correct as-is (follows the SAD pattern)
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

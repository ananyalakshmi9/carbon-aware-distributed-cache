const express = require("express");
const cors = require("cors");

const Cache = require("./cache/cache");

const app = express();
app.use(express.json());
app.use(cors());

const cache = new Cache();

// ---------------------------------------------
// SCRUM-12: Health Endpoint
// ---------------------------------------------
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "simple-cache",
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------
// SCRUM-13: Retrieve Cache Value
// GET /v1/cache/:key
// ---------------------------------------------
app.get("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const value = cache.get(key);

  if (value === null) {
    return res.status(404).json({ error: "Key not found" });
  }

  res.status(200).json({ key, value });
});

// ---------------------------------------------
// SCRUM-14: Delete Cache Key
// DELETE /v1/cache/:key
// ---------------------------------------------
app.delete("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const deleted = cache.delete(key);

  if (!deleted) {
    return res.status(404).json({ error: "Key not found" });
  }

  res.status(200).json({ message: "Key deleted", key });
});

// ---------------------------------------------
// SCRUM-25: /metrics Endpoint
// ---------------------------------------------
app.get("/metrics", (req, res) => {
  res.status(200).json({
    hits: cache.hits || 0,
    misses: cache.misses || 0,
    items: Object.keys(cache.store || {}).length,
    expired: cache.expired || 0,
  });
});

// ---------------------------------------------
// DO NOT START SERVER DURING TESTS
// ---------------------------------------------
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => {
    console.log(`Simple cache listening on port ${PORT}`);
  });
}

module.exports = app;

const express = require("express");
const cors = require("cors");

const Cache = require("./cache/cache");

const app = express();
app.use(express.json());
app.use(cors());

const cache = new Cache();

// ------------------------------------------------
// SCRUM-12: Health Endpoint
// ------------------------------------------------
app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "simple-cache",
    timestamp: new Date().toISOString(),
  });
});

// ------------------------------------------------
// SCRUM-11: Insert/Update Cache Value (needed for tests)
// ------------------------------------------------
app.post("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (value === undefined || value === null) {
    return res.status(400).json({ error: "Value is required" });
  }

  cache.set(key, value);
  return res.status(201).json({ message: "Value stored", key, value });
});

// ------------------------------------------------
// SCRUM-13: Retrieve Cache Value
// ------------------------------------------------
app.get("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const value = cache.get(key);

  if (value === null) {
    return res.status(404).json({ error: "Key not found" });
  }

  return res.status(200).json({ key, value });
});

// ------------------------------------------------
// SCRUM-14: Delete Cache Key
// ------------------------------------------------
app.delete("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const deleted = cache.delete(key);

  if (!deleted) {
    return res.status(404).json({ error: "Key not found" });
  }

  return res.status(200).json({ message: "Key deleted", key });
});

// ------------------------------------------------
// SCRUM-25: Metrics Endpoint
// ------------------------------------------------
app.get("/metrics", (req, res) => {
  res.status(200).json({
    hits: cache.hits,
    misses: cache.misses,
    items: Object.keys(cache.store).length,
    expired: cache.expired,
  });
});

// ------------------------------------------------
// Start Server Only When Not Testing
// ------------------------------------------------
if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`Simple cache listening on port ${PORT}`)
  );
}

module.exports = app;

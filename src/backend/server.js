const express = require("express");
const cors = require("cors");

const Cache = require("./cache/cache");

const app = express();
app.use(express.json());
app.use(cors());

const cache = new Cache();

// -------------------------------------
// SCRUM-12 / SCRUM-17: Health Endpoint
// -------------------------------------
app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "simple-cache",
    region: process.env.NODE_REGION || "unknown",
    capacity: cache.capacity,
    items: Object.keys(cache.store).length,
    timestamp: new Date().toISOString(),
  });
});

// -------------------------------------
// SCRUM-11: INSERT (POST)
// -------------------------------------
app.post("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const { value, recomputeCost } = req.body || {};

  if (value === undefined || value === null) {
    return res.status(400).json({ error: "Value is required" });
  }

  cache.set(key, value, recomputeCost);
  return res.status(201).json({ message: "Value stored", key, value, recomputeCost });
});

app.put("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const { value, recomputeCost } = req.body || {};

  if (value === undefined || value === null) {
    return res.status(400).json({ error: "Value is required" });
  }

  cache.set(key, value, recomputeCost);
  return res.status(200).json({ message: "Value updated", key, value, recomputeCost });
});

// -------------------------------------
// SCRUM-11 EXTENDED: UPDATE (PUT)
// -------------------------------------
app.put("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const { value, recomputeCost } = req.body || {};

  if (value === undefined || value === null) {
    return res.status(400).json({ error: "Value is required" });
  }

  cache.set(key, value, recomputeCost);
  return res.status(200).json({ message: "Value updated", key, value, recomputeCost });
});

// -------------------------------------
// SCRUM-13: Retrieve
// -------------------------------------
app.get("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const value = cache.get(key);

  if (value === null) {
    return res.status(404).json({ error: "Key not found" });
  }

  return res.status(200).json({ key, value });
});

// -------------------------------------
// SCRUM-14: Delete
// -------------------------------------
app.delete("/v1/cache/:key", (req, res) => {
  const { key } = req.params;
  const deleted = cache.delete(key);

  if (!deleted) {
    return res.status(404).json({ error: "Key not found" });
  }

  return res.status(200).json({ message: "Key deleted", key });
});

// -------------------------------------
// Research Extensions: Node Simulated Time & Keys list
// -------------------------------------
app.post("/v1/node/time", (req, res) => {
  const { hour } = req.body;
  if (hour !== undefined && hour !== null) {
    cache.setSimulatedHour(hour);
  }
  return res.status(200).json({ status: "ok", simulatedHour: cache.simulatedHour });
});

app.get("/v1/keys", (req, res) => {
  const keysMetadata = {};
  for (const key of Object.keys(cache.store)) {
    keysMetadata[key] = {
      recomputeCost: cache.store[key].recomputeCost,
      lastAccess: cache.store[key].lastAccess,
      accessCount: cache.store[key].accessCount,
      value: cache.store[key].value
    };
  }
  return res.status(200).json(keysMetadata);
});

// -------------------------------------
// SCRUM-25: Metrics
// -------------------------------------
app.get("/metrics", (req, res) => {
  res.status(200).json({
    hits: cache.hits ?? 0,
    misses: cache.misses ?? 0,
    items: Object.keys(cache.store).length,
    expired: cache.expired ?? 0,
    evictions: cache.evictions ?? 0,
  });
});

// -------------------------------------
// Start server only outside tests
// -------------------------------------
if (require.main === module) {
  const PORT = process.env.NODE_PORT || process.env.PORT || 4000;
  app.listen(PORT, () =>
    console.log(`Simple cache listening on port ${PORT}`)
  );
}

module.exports = app;

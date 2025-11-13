const express = require("express");
const cors = require("cors");
const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// ✅ Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: new Date().toISOString(),
  });
});

// Sample route to verify backend is running
app.get("/", (req, res) => {
  res.status(200).send("Simple Cache Service is running!");
});

app.listen(PORT, () => {
  console.log(`✅ Backend service running on port ${PORT}`);
});

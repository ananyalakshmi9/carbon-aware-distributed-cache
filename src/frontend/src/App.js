import React, { useState } from "react";

function App() {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const [ttl, setTtl] = useState("");
  const [resp, setResp] = useState("");
  const [health, setHealth] = useState("Unknown");
  const [metrics, setMetrics] = useState("");

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:4000";

  // --- Health Check ---
  const checkHealth = async () => {
    const r = await fetch(`${apiBase}/health`);
    const j = await r.json();
    setHealth(j.status);
  };

  // --- Metrics ---
  const loadMetrics = async () => {
    const r = await fetch(`${apiBase}/metrics`);
    const j = await r.json();
    setMetrics(JSON.stringify(j, null, 2));
  };

  // --- PUT ---
  const putKey = async () => {
    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}${
      ttl ? `?ttl=${encodeURIComponent(ttl)}` : ""
    }`;

    const r = await fetch(url, {
      method: "PUT",
      body: val
    });
    const j = await r.json();
    setResp(`PUT '${key}' OK (Status: ${r.status})`);
  };

  // --- GET ---
  const getKey = async () => {
    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    const r = await fetch(url);

    if (r.status === 200) {
      const blob = await r.blob();
      const text = await blob.text();
      setResp(`GET '${key}' → ${text}`);
    } else {
      setResp("Key not found.");
    }
  };

  return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 20 }}>
      {/* BLUE HEADER */}
      <div style={{ background: "#0d6efd", padding: 20, color: "white", borderRadius: 8 }}>
        <h1>Cache Service Dashboard</h1>
      </div>

      {/* SYSTEM STATUS */}
      <section style={{ marginTop: 20 }}>
        <h2>System Status</h2>
        <button
          onClick={checkHealth}
          style={{
            background: "#0d6efd",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Check Health
        </button>
        <p style={{ marginTop: 10 }}>
          Status:{" "}
          <strong>
            {health === "ok" || health === "OK" ? (
              <span style={{ color: "green" }}>OK ●</span>
            ) : (
              <span style={{ color: "red" }}>Offline ●</span>
            )}
          </strong>
        </p>
      </section>

      {/* LIVE METRICS */}
      <section style={{ marginTop: 20 }}>
        <h2>Live Metrics</h2>
        <button
          onClick={loadMetrics}
          style={{
            background: "#0d6efd",
            color: "white",
            border: "none",
            padding: "10px 15px",
            borderRadius: 6,
            cursor: "pointer"
          }}
        >
          Refresh Metrics
        </button>

        <pre
          style={{
            background: "#222",
            color: "#eee",
            padding: 15,
            borderRadius: 6,
            marginTop: 10,
            fontSize: 14,
            overflowX: "auto"
          }}
        >
          {metrics || "No metrics loaded yet."}
        </pre>
      </section>

      {/* CACHE EXPLORER */}
      <section style={{ marginTop: 20 }}>
        <h2>Cache Explorer</h2>

        <div style={{ display: "flex", gap: 10 }}>
          <input
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
            placeholder="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          <button
            onClick={getKey}
            style={{
              background: "#0d6efd",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            GET
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
            placeholder="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />

          <input
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
            placeholder="value"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />

          <input
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              width: "120px"
            }}
            placeholder="TTL"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
          />

          <button
            onClick={putKey}
            style={{
              background: "#0d6efd",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            PUT
          </button>
        </div>

        <h3 style={{ marginTop: 20 }}>Result:</h3>
        <pre
          style={{
            background: "#222",
            color: "#eee",
            padding: 15,
            borderRadius: 6,
            marginTop: 10,
            fontSize: 14
          }}
        >
          {resp}
        </pre>
      </section>
    </div>
  );
}

export default App;

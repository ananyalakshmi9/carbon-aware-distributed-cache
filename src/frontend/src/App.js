import React, { useState } from "react";

function App() {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const [ttl, setTtl] = useState("");
  const [resp, setResp] = useState("");
  const [health, setHealth] = useState("Unknown");
  const [metrics, setMetrics] = useState("");

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:4000";

  // --- HEALTH CHECK ---
  const checkHealth = async () => {
    const r = await fetch(`${apiBase}/health`);
    const j = await r.json();
    setHealth(j.status);
  };

  // --- METRICS ---
  const loadMetrics = async () => {
    const r = await fetch(`${apiBase}/metrics`);
    const j = await r.json();
    setMetrics(JSON.stringify(j, null, 2));
  };

  // --- PUT (Insert/Update) ---
  const putKey = async () => {
    if (!key.trim()) return setResp("Key is required");
    if (!val.trim()) return setResp("Value is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;

    const r = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ value: val }) // IMPORTANT FIX
    });

    setResp(`PUT '${key}' → Status ${r.status}`);
  };

  // --- GET ---
  const getKey = async () => {
    if (!key.trim()) return setResp("Key is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    const r = await fetch(url);

    if (r.status === 200) {
      const j = await r.json();
      setResp(`GET '${key}' → ${JSON.stringify(j.value)}`);
    } else {
      setResp(`GET '${key}' → Key not found`);
    }
  };

  // --- DELETE ---
  const deleteKey = async () => {
    if (!key.trim()) return setResp("Key is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    const r = await fetch(url, { method: "DELETE" });

    if (r.status === 200) {
      setResp(`DELETE '${key}' → deleted`);
    } else {
      setResp(`DELETE '${key}' → Key not found`);
    }
  };

  return (
    <div style={{ fontFamily: "Arial", padding: 20 }}>
      {/* HEADER */}
      <div style={{
        background: "#0d6efd",
        padding: 20,
        color: "white",
        borderRadius: 8
      }}>
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
            {health === "ok"
              ? <span style={{ color: "green" }}>OK ●</span>
              : <span style={{ color: "red" }}>Offline ●</span>}
          </strong>
        </p>
      </section>

      {/* METRICS */}
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

        <pre style={{
          background: "#222",
          color: "#eee",
          padding: 15,
          borderRadius: 6,
          marginTop: 10
        }}>
          {metrics || "No metrics loaded yet."}
        </pre>
      </section>

      {/* CACHE EXPLORER */}
      <section style={{ marginTop: 20 }}>
        <h2>Cache Explorer</h2>

        {/* GET */}
        <div style={{ display: "flex", gap: 10 }}>
          <input
            placeholder="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
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

        {/* PUT */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            placeholder="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }}
          />

          <input
            placeholder="value"
            value={val}
            onChange={(e) => setVal(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", flex: 1 }}
          />

          <input
            placeholder="TTL (not used)"
            value={ttl}
            onChange={(e) => setTtl(e.target.value)}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #ccc", width: 120 }}
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

        {/* DELETE */}
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <input
            placeholder="key"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            style={{
              padding: 8,
              borderRadius: 4,
              border: "1px solid #ccc",
              flex: 1
            }}
          />
          <button
            onClick={deleteKey}
            style={{
              background: "red",
              color: "white",
              border: "none",
              padding: "10px 15px",
              borderRadius: 6,
              cursor: "pointer"
            }}
          >
            DELETE
          </button>
        </div>

        {/* RESULT */}
        <h3 style={{ marginTop: 20 }}>Result:</h3>
        <pre style={{
          background: "#222",
          color: "#eee",
          padding: 15,
          borderRadius: 6,
          marginTop: 10
        }}>
          {resp}
        </pre>
      </section>
    </div>
  );
}

export default App;

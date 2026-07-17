import React, { useState, useEffect } from "react";

function App() {
  const [key, setKey] = useState("");
  const [val, setVal] = useState("");
  const [recomputeCost, setRecomputeCost] = useState("1.0");
  const [resp, setResp] = useState("");
  const [health, setHealth] = useState("Unknown");
  const [metrics, setMetrics] = useState(null);

  // Status states
  const [clusterNodes, setClusterNodes] = useState([]);
  const [simulatedHour, setSimulatedHour] = useState(0);
  const [decisions, setDecisions] = useState([]);

  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:4000";

  // --- HEALTH CHECK ---
  const checkHealth = async () => {
    try {
      const r = await fetch(`${apiBase}/health`);
      const j = await r.json();
      setHealth(j.status);
    } catch (e) {
      setHealth("offline");
    }
  };

  // --- METRICS ---
  const loadMetrics = async () => {
    try {
      const r = await fetch(`${apiBase}/metrics`);
      const j = await r.json();
      setMetrics(j);
    } catch (e) {}
  };

  // --- CLUSTER STATUS ---
  const loadClusterStatus = async () => {
    try {
      const r = await fetch(`${apiBase}/v1/cluster/status`);
      const j = await r.json();
      setClusterNodes(j.nodes || []);
      if (j.simulatedHour !== null && j.simulatedHour !== undefined) {
        setSimulatedHour(j.simulatedHour);
      }
    } catch (e) {}
  };

  // --- DECISIONS LOG ---
  const loadDecisions = async () => {
    try {
      const r = await fetch(`${apiBase}/v1/cluster/decisions`);
      const j = await r.json();
      setDecisions(j.slice().reverse());
    } catch (e) {}
  };

  // --- TIME CHANGE ---
  const updateSimulatedHour = async (hour) => {
    try {
      await fetch(`${apiBase}/v1/cluster/time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hour: parseInt(hour, 10) }),
      });
      setSimulatedHour(hour);
      loadClusterStatus();
      loadDecisions();
    } catch (e) {}
  };

  // --- MANUAL REBALANCE ---
  const triggerRebalance = async () => {
    try {
      setResp("Triggering rebalance...");
      const res = await fetch(`${apiBase}/v1/cluster/rebalance`, { method: "POST" });
      if (res.ok) {
        setResp("Rebalance completed!");
        loadClusterStatus();
        loadDecisions();
      } else {
        setResp("Rebalance failed");
      }
    } catch (e) {
      setResp("Rebalance error: " + e.message);
    }
  };

  // --- PUT/POST ---
  const handleWrite = async (method) => {
    if (!key.trim()) return setResp("Key is required");
    if (!val.trim()) return setResp("Value is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    try {
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          value: val,
          recomputeCost: parseFloat(recomputeCost),
        }),
      });
      const data = await r.json();
      setResp(`${method} '${key}' → Status ${r.status}\n${JSON.stringify(data, null, 2)}`);
      loadClusterStatus();
      loadMetrics();
      loadDecisions();
    } catch (e) {
      setResp(`Error: ${e.message}`);
    }
  };

  // --- GET ---
  const getKey = async () => {
    if (!key.trim()) return setResp("Key is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    try {
      const r = await fetch(url);
      if (r.status === 200) {
        const j = await r.json();
        setResp(`GET '${key}' → Status 200\nValue: ${JSON.stringify(j.value, null, 2)}`);
        loadMetrics();
      } else {
        setResp(`GET '${key}' → Key not found (Status ${r.status})`);
      }
    } catch (e) {
      setResp(`Error: ${e.message}`);
    }
  };

  // --- DELETE ---
  const deleteKey = async () => {
    if (!key.trim()) return setResp("Key is required");

    const url = `${apiBase}/v1/cache/${encodeURIComponent(key)}`;
    try {
      const r = await fetch(url, { method: "DELETE" });
      if (r.status === 200) {
        setResp(`DELETE '${key}' → Deleted successfully`);
        loadClusterStatus();
        loadMetrics();
        loadDecisions();
      } else {
        setResp(`DELETE '${key}' → Key not found (Status ${r.status})`);
      }
    } catch (e) {
      setResp(`Error: ${e.message}`);
    }
  };

  // Poll metrics, status, decisions every 3 seconds
  useEffect(() => {
    checkHealth();
    loadClusterStatus();
    loadMetrics();
    loadDecisions();

    const interval = setInterval(() => {
      checkHealth();
      loadClusterStatus();
      loadMetrics();
      loadDecisions();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const getCarbonColor = (carbon) => {
    if (carbon < 150) return "#198754"; // Green
    if (carbon < 350) return "#ffc107"; // Yellow/Orange
    return "#dc3545"; // Red
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: 25, backgroundColor: "#f8f9fa", minHeight: "100vh" }}>
      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)",
        padding: "25px 30px",
        color: "white",
        borderRadius: 12,
        boxShadow: "0 4px 15px rgba(0,0,0,0.1)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.8rem" }}>Carbon-Aware Distributed Cache</h1>
          <p style={{ margin: "5px 0 0 0", opacity: 0.8 }}>Sustainable spatiotemporal scheduling prototype</p>
        </div>
        <div style={{ textAlign: "right" }}>
          <div>Status: <strong>
            {health === "ok" 
              ? <span style={{ color: "#2ebd59" }}>ONLINE ●</span>
              : <span style={{ color: "#ff4d4d" }}>OFFLINE ●</span>}
          </strong></div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 25 }}>
        {/* LEFT COLUMN: CONTROL & OPERATIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* SIMULATED TIME PANEL */}
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Simulated Time & Grid Control</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 15, marginTop: 15 }}>
              <label style={{ fontWeight: 600 }}>Hour of Day: {simulatedHour}:00</label>
              <input
                type="range"
                min="0"
                max="23"
                value={simulatedHour}
                onChange={(e) => updateSimulatedHour(e.target.value)}
                style={{ flex: 1, cursor: "pointer" }}
              />
            </div>
            <p style={{ fontSize: "0.85rem", color: "#666", marginTop: 5 }}>
              Drag to simulate diurnal carbon intensity fluctuations. West region has low intensity at night, Central at midday.
            </p>
            <button
              onClick={triggerRebalance}
              style={{
                backgroundColor: "#2a5298",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: 6,
                fontWeight: 600,
                cursor: "pointer",
                marginTop: 10
              }}
            >
              Trigger Rebalance Migration Now
            </button>
          </div>

          {/* CACHE EXPLORER */}
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Cache Explorer</h3>
            
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 15 }}>
              <div style={{ display: "flex", gap: 10 }}>
                <input
                  placeholder="Key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  style={{ padding: "10px", borderRadius: 6, border: "1px solid #ccc", flex: 1 }}
                />
                <input
                  placeholder="Value (for writes)"
                  value={val}
                  onChange={(e) => setVal(e.target.value)}
                  style={{ padding: "10px", borderRadius: 6, border: "1px solid #ccc", flex: 2 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <label style={{ fontSize: "0.9rem", fontWeight: 600, color: "#555" }}>Recompute Cost:</label>
                <input
                  type="number"
                  step="0.5"
                  value={recomputeCost}
                  onChange={(e) => setRecomputeCost(e.target.value)}
                  style={{ padding: "8px", borderRadius: 6, border: "1px solid #ccc", width: 80 }}
                />
                <span style={{ fontSize: "0.8rem", color: "#666" }}>(used in score-based eviction)</span>
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
                <button onClick={getKey} style={{ backgroundColor: "#efefef", border: "1px solid #ccc", padding: "10px 15px", borderRadius: 6, cursor: "pointer", flex: 1, fontWeight: 600 }}>GET</button>
                <button onClick={() => handleWrite("POST")} style={{ backgroundColor: "#198754", color: "white", border: "none", padding: "10px 15px", borderRadius: 6, cursor: "pointer", flex: 1, fontWeight: 600 }}>POST (Store)</button>
                <button onClick={() => handleWrite("PUT")} style={{ backgroundColor: "#0dcaf0", color: "white", border: "none", padding: "10px 15px", borderRadius: 6, cursor: "pointer", flex: 1, fontWeight: 600 }}>PUT (Update)</button>
                <button onClick={deleteKey} style={{ backgroundColor: "#dc3545", color: "white", border: "none", padding: "10px 15px", borderRadius: 6, cursor: "pointer", flex: 1, fontWeight: 600 }}>DELETE</button>
              </div>
            </div>

            <h4 style={{ marginBottom: 5, marginTop: 20 }}>Operation Log:</h4>
            <pre style={{
              background: "#222",
              color: "#eee",
              padding: 15,
              borderRadius: 6,
              fontSize: "0.85rem",
              overflowX: "auto",
              maxHeight: 150
            }}>
              {resp || "No operations performed yet."}
            </pre>
          </div>

          {/* AGGREGATED METRICS */}
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Cluster Aggregated Metrics</h3>
            {metrics ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 15, marginTop: 15 }}>
                <div style={{ borderLeft: "4px solid #1e3c72", paddingLeft: 10 }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Cache Hits</span>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{metrics.hits}</div>
                </div>
                <div style={{ borderLeft: "4px solid #ffc107", paddingLeft: 10 }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Cache Misses</span>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{metrics.misses}</div>
                </div>
                <div style={{ borderLeft: "4px solid #198754", paddingLeft: 10 }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Total Key Items</span>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{metrics.items}</div>
                </div>
                <div style={{ borderLeft: "4px solid #dc3545", paddingLeft: 10 }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Total Evictions</span>
                  <div style={{ fontSize: "1.4rem", fontWeight: 700 }}>{metrics.expired + (metrics.evictions || 0)}</div>
                </div>
                <div style={{ gridColumn: "span 2", borderTop: "1px solid #eee", paddingTop: 10, marginTop: 5 }}>
                  <span style={{ fontSize: "0.85rem", color: "#666" }}>Global Hit Rate</span>
                  <div style={{ fontSize: "1.6rem", fontWeight: 700, color: "#1e3c72" }}>
                    {((metrics.hits / (metrics.hits + metrics.misses || 1)) * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            ) : (
              <p>Loading metrics...</p>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: TOPOLOGY & DECISIONS */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          
          {/* CLUSTER NODE STATUS */}
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0 }}>Cluster Regions & Topology</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 15, marginTop: 15 }}>
              {clusterNodes.map((n) => {
                const loadPercentage = n.capacity > 0 ? (n.items / n.capacity) * 100 : 0;
                return (
                  <div key={n.node} style={{
                    border: "1px solid #e0e0e0",
                    borderRadius: 8,
                    padding: 15,
                    position: "relative",
                    backgroundColor: n.healthy ? "#ffffff" : "#fdf2f2"
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: "#2a5298" }}>{n.region.toUpperCase()}</strong>
                      <span style={{
                        fontSize: "0.8rem",
                        padding: "3px 8px",
                        borderRadius: 12,
                        backgroundColor: n.healthy ? "#d1e7dd" : "#f8d7da",
                        color: n.healthy ? "#0f5132" : "#842029",
                        fontWeight: 600
                      }}>
                        {n.healthy ? "HEALTHY" : "DOWN"}
                      </span>
                    </div>

                    <div style={{ fontSize: "0.85rem", color: "#666", marginTop: 5 }}>Node URL: {n.node}</div>

                    {n.healthy && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 10 }}>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#666" }}>Carbon Intensity:</span>
                          <div style={{ fontWeight: 700, color: getCarbonColor(n.carbonIntensity) }}>
                            {n.carbonIntensity} gCO₂/kWh
                          </div>
                        </div>
                        <div>
                          <span style={{ fontSize: "0.75rem", color: "#666" }}>Keys Ring share:</span>
                          <div style={{ fontWeight: 700 }}>{n.keysOwnedPercentage}%</div>
                        </div>
                      </div>
                    )}

                    {n.healthy && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.75rem", color: "#555" }}>
                          <span>Capacity utilization:</span>
                          <strong>{n.items} / {n.capacity} keys</strong>
                        </div>
                        <div style={{ width: "100%", height: 8, backgroundColor: "#eee", borderRadius: 4, marginTop: 4, overflow: "hidden" }}>
                          <div style={{
                            width: `${Math.min(loadPercentage, 100)}%`,
                            height: "100%",
                            backgroundColor: loadPercentage >= 80 ? "#dc3545" : "#198754",
                            borderRadius: 4
                          }}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* DECISIONS FEED */}
          <div style={{ backgroundColor: "white", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.05)", display: "flex", flexDirection: "column", flex: 1 }}>
            <h3 style={{ marginTop: 0 }}>Recent Decisions & Rebalance Log</h3>
            <div style={{
              flex: 1,
              maxHeight: 400,
              overflowY: "auto",
              marginTop: 15,
              border: "1px solid #eee",
              borderRadius: 6,
              padding: 10,
              backgroundColor: "#fafafa"
            }}>
              {decisions.length === 0 ? (
                <p style={{ color: "#888", textAlign: "center", marginTop: 20 }}>No placement or migration events logged yet.</p>
              ) : (
                decisions.map((d, index) => {
                  let title = "";
                  let subtitle = "";
                  let detailText = "";
                  let badgeColor = "#2a5298";

                  if (d.type === "placement") {
                    title = `Placement: ${d.key}`;
                    subtitle = `Placed on ${d.chosenNode.substring(d.chosenNode.lastIndexOf(":") + 1)} (Primary target: ${d.primaryNode.substring(d.primaryNode.lastIndexOf(":") + 1)})`;
                    badgeColor = "#198754";
                    detailText = `Cost: ${d.lowestCost} | Recompute cost: ${d.recomputeCost}`;
                    if (d.excludedNodes && d.excludedNodes.length > 0) {
                      detailText += `\nExcluded (over capacity): ${d.excludedNodes.map(ex => ex.node.substring(ex.node.lastIndexOf(":")+1)).join(", ")}`;
                    }
                    if (d.fallbackTriggered) {
                      detailText += `\n[FALLBACK TRIGGERED: ROUTED TO LEAST LOADED NODE]`;
                    }
                  } else if (d.type === "migration") {
                    title = `MIGRATION: ${d.key}`;
                    subtitle = `Moved ${d.sourceNode.substring(d.sourceNode.lastIndexOf(":") + 1)} → ${d.targetNode.substring(d.targetNode.lastIndexOf(":") + 1)}`;
                    badgeColor = "#ffc107";
                    detailText = `Carbon Saved score: ${d.carbonSaved}\nSource Cost: ${d.details.sourceCost} | Target Cost: ${d.details.targetCost}`;
                  } else if (d.type === "rebalance_evaluation") {
                    title = `Evaluation: ${d.key}`;
                    subtitle = `Action: ${d.decision.toUpperCase()}`;
                    badgeColor = d.decision === "migrate" ? "#ffc107" : "#6c757d";
                    detailText = `Reason: ${d.reason}\nSavings score delta: ${d.carbonSavingsDelta}`;
                  }

                  return (
                    <div key={index} style={{
                      backgroundColor: "white",
                      border: "1px solid #eef0f2",
                      borderRadius: 6,
                      padding: "10px 12px",
                      marginBottom: 10,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.02)"
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span style={{
                          fontSize: "0.7rem",
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: badgeColor,
                          color: badgeColor === "#ffc107" ? "#212529" : "white",
                          fontWeight: 700,
                          textTransform: "uppercase"
                        }}>{d.type}</span>
                        <span style={{ fontSize: "0.75rem", color: "#999" }}>{new Date(d.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ fontWeight: 600, fontSize: "0.9rem", marginTop: 5 }}>{title}</div>
                      <div style={{ fontSize: "0.8rem", color: "#555", marginTop: 2 }}>{subtitle}</div>
                      <pre style={{
                        margin: "5px 0 0 0",
                        padding: 8,
                        backgroundColor: "#f5f6f8",
                        borderRadius: 4,
                        fontSize: "0.75rem",
                        color: "#333",
                        whiteSpace: "pre-wrap"
                      }}>{detailText}</pre>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;

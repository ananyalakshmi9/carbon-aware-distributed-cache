const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const HashRing = require("./hashRing");
const CarbonDataService = require("./carbonData");

const app = express();
app.use(express.json());
app.use(cors());

const configuredNodes = process.env.COORDINATOR_NODES
  ? process.env.COORDINATOR_NODES.split(",").map((n) => n.trim())
  : [];

const vnodesCount = parseInt(process.env.VNODE_COUNT || "150", 10);
const ring = new HashRing([], { vnodes: vnodesCount });
const nodeStatus = {};

for (const node of configuredNodes) {
  nodeStatus[node] = { healthy: false, region: "unknown", vnodes: vnodesCount, capacity: 100, items: 0 };
}

function getNodeItemCount(node) {
  return Object.values(keyLocation).filter((loc) => loc === node).length;
}

// Carbon parameters
const routingPenaltyWeight = parseFloat(process.env.COORDINATOR_ROUTING_PENALTY ?? "150");
const costScale = parseFloat(process.env.COORDINATOR_COST_SCALE ?? "0.5");
const migrationCostWeight = parseFloat(process.env.COORDINATOR_MIGRATION_COST ?? "100");

const placementStrategy = process.env.PLACEMENT_STRATEGY || "carbon_naive";
const capacityThreshold = parseFloat(process.env.PLACEMENT_CAPACITY_THRESHOLD || "0.8");
const migrationCapacityThreshold = parseFloat(process.env.MIGRATION_CAPACITY_THRESHOLD || "0.9");

const carbonService = new CarbonDataService();
let simulatedHour = null;

// Routing directory for located keys: key -> node URL
const keyLocation = {};

// Decision Logging
const decisionLogPath = path.join(__dirname, "decision-log.json");
let decisions = [];

if (fs.existsSync(decisionLogPath)) {
  try {
    decisions = JSON.parse(fs.readFileSync(decisionLogPath));
  } catch (e) {
    decisions = [];
  }
}

function logDecision(decision) {
  decisions.push({
    timestamp: new Date().toISOString(),
    ...decision,
  });
  if (decisions.length > 1000) {
    decisions.shift();
  }
  try {
    fs.writeFileSync(decisionLogPath, JSON.stringify(decisions, null, 2));
  } catch (e) {
    // Ignore
  }
}

// Perform health checks and broadcast time
async function checkHealth() {
  for (const node of configuredNodes) {
    try {
      const response = await fetch(`${node}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        const data = await response.json();
        if (!nodeStatus[node].healthy) {
          nodeStatus[node].healthy = true;
          ring.addNode(node);
        }
        nodeStatus[node].region = data.region || "unknown";
        nodeStatus[node].capacity = data.capacity || 100;
        nodeStatus[node].items = data.items || 0;

        // Sync simulated time to the node if set
        if (simulatedHour !== null && simulatedHour !== undefined) {
          await fetch(`${node}/v1/node/time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hour: simulatedHour }),
            signal: AbortSignal.timeout(1000),
          }).catch(() => {});
        }
      } else {
        if (nodeStatus[node].healthy) {
          nodeStatus[node].healthy = false;
          ring.removeNode(node);
        }
      }
    } catch (err) {
      if (nodeStatus[node].healthy) {
        nodeStatus[node].healthy = false;
        ring.removeNode(node);
      }
    }
  }
}

checkHealth();
const healthCheckInterval = setInterval(checkHealth, 1000);
healthCheckInterval.unref();

// Proxy request helper
async function proxyToNode(node, key, req, res) {
  const queryIndex = req.url.indexOf("?");
  const queryString = queryIndex !== -1 ? req.url.substring(queryIndex) : "";
  const url = `${node}/v1/cache/${key}${queryString}`;

  try {
    const options = {
      method: req.method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (req.method === "POST" || req.method === "PUT") {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url, options);
    const text = await response.text();

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      data = { message: text };
    }

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(502).json({ error: `Failed to contact cache node: ${error.message}` });
  }
}

// Proxy handler with Carbon-Aware Placement
async function handleProxy(req, res) {
  const { key } = req.params;
  const primaryNode = ring.getNode(key);

  if (!primaryNode) {
    return res.status(503).json({ error: "No healthy cache nodes available" });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const { value, recomputeCost } = req.body || {};
    const cost =
      recomputeCost !== undefined && recomputeCost !== null ? parseFloat(recomputeCost) : 1.0;

    const healthyNodes = configuredNodes.filter((n) => nodeStatus[n].healthy);

    let candidateNodes = healthyNodes;
    const excludedNodesList = [];
    let fallbackTriggered = false;

    if (placementStrategy === "carbon_capacity_aware") {
      candidateNodes = healthyNodes.filter((n) => {
        const currentCount = getNodeItemCount(n);
        const cap = nodeStatus[n].capacity || 100;
        if (currentCount >= capacityThreshold * cap) {
          excludedNodesList.push({ node: n, currentCount, capacity: cap });
          return false;
        }
        return true;
      });

      if (candidateNodes.length === 0) {
        fallbackTriggered = true;
        let leastLoadedNode = healthyNodes[0];
        let minCount = Infinity;
        for (const n of healthyNodes) {
          const currentCount = getNodeItemCount(n);
          if (currentCount < minCount) {
            minCount = currentCount;
            leastLoadedNode = n;
          }
        }
        candidateNodes = [leastLoadedNode];
        console.log(`[Coordinator] Fallback triggered: All nodes overloaded. Selected least loaded node: ${leastLoadedNode} (items: ${minCount})`);
      }
    }

    let bestNode = primaryNode;
    if (candidateNodes.length > 0) {
      bestNode = candidateNodes[0];
    }
    let lowestCost = Infinity;
    const candidates = [];

    for (const n of healthyNodes) {
      const reg = nodeStatus[n].region;
      const carbon = await carbonService.getCarbonIntensity(reg, simulatedHour);
      const isPrimary = n === primaryNode;
      const routingPenalty = isPrimary ? 0 : routingPenaltyWeight;
      const carbonImpact = carbon * (1 + costScale * cost);
      const placementCost = carbonImpact + routingPenalty;

      const isCandidate = candidateNodes.includes(n);
      candidates.push({
        node: n,
        region: reg,
        carbonIntensity: carbon,
        placementCost,
        isCandidate,
        currentCount: getNodeItemCount(n),
        capacity: nodeStatus[n].capacity || 100
      });

      if (isCandidate && placementCost < lowestCost) {
        lowestCost = placementCost;
        bestNode = n;
      }
    }

    // Log decision
    logDecision({
      type: "placement",
      strategy: placementStrategy,
      key,
      primaryNode,
      chosenNode: bestNode,
      recomputeCost: cost,
      lowestCost: parseFloat(lowestCost.toFixed(2)),
      excludedNodes: excludedNodesList,
      fallbackTriggered,
      candidates: candidates.map((c) => ({
        ...c,
        placementCost: parseFloat(c.placementCost.toFixed(2)),
      })),
    });

    keyLocation[key] = bestNode;
    return proxyToNode(bestNode, key, req, res);
  } else if (req.method === "DELETE") {
    const targetNode =
      keyLocation[key] && nodeStatus[keyLocation[key]] && nodeStatus[keyLocation[key]].healthy
        ? keyLocation[key]
        : primaryNode;
    delete keyLocation[key];
    return proxyToNode(targetNode, key, req, res);
  } else {
    // GET
    const targetNode =
      keyLocation[key] && nodeStatus[keyLocation[key]] && nodeStatus[keyLocation[key]].healthy
        ? keyLocation[key]
        : primaryNode;
    return proxyToNode(targetNode, key, req, res);
  }
}

// Rebalancing Worker
async function runRebalancing() {
  const healthyNodes = configuredNodes.filter((n) => nodeStatus[n].healthy);
  if (healthyNodes.length <= 1) return;

  // 1. Fetch keys from all nodes
  const allKeys = {};
  for (const node of healthyNodes) {
    try {
      const res = await fetch(`${node}/v1/keys`, { signal: AbortSignal.timeout(1000) });
      if (res.ok) {
        const keysData = await res.json();
        for (const key of Object.keys(keysData)) {
          allKeys[key] = {
            currentNode: node,
            metadata: keysData[key],
          };
          keyLocation[key] = node;
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  // 2. Evaluate migration
  for (const key of Object.keys(allKeys)) {
    const { currentNode, metadata } = allKeys[key];
    const cost = metadata.recomputeCost !== undefined ? parseFloat(metadata.recomputeCost) : 1.0;
    const value = metadata.value;
    const primaryNode = ring.getNode(key);

    if (!primaryNode) continue;

    const currentReg = nodeStatus[currentNode].region;
    const currentCarbon = await carbonService.getCarbonIntensity(currentReg, simulatedHour);
    const isCurrentPrimary = currentNode === primaryNode;
    const currentRoutingPenalty = isCurrentPrimary ? 0 : routingPenaltyWeight;
    const currentCarbonImpact = currentCarbon * (1 + costScale * cost);
    const currentPlacementCost = currentCarbonImpact + currentRoutingPenalty;

    let bestNode = currentNode;
    let lowestCost = currentPlacementCost;
    const altDetails = [];
    let alternativeEvaluated = false;

    for (const n of healthyNodes) {
      if (n === currentNode) continue;

      let isExcluded = false;
      let reasonEx = null;

      if (placementStrategy === "carbon_capacity_aware") {
        const currentCount = getNodeItemCount(n);
        const cap = nodeStatus[n].capacity || 100;
        if (currentCount >= migrationCapacityThreshold * cap) {
          isExcluded = true;
          reasonEx = `target node over migration capacity threshold (${currentCount}/${cap})`;
        }
      }

      if (isExcluded) {
        altDetails.push({ node: n, excluded: true, reason: reasonEx });
        continue;
      }

      alternativeEvaluated = true;
      const reg = nodeStatus[n].region;
      const carbon = await carbonService.getCarbonIntensity(reg, simulatedHour);
      const isPrimary = n === primaryNode;
      const routingPenalty = isPrimary ? 0 : routingPenaltyWeight;
      const carbonImpact = carbon * (1 + costScale * cost);
      const placementCost = carbonImpact + routingPenalty;

      altDetails.push({ node: n, excluded: false, placementCost, carbon });

      if (placementCost + migrationCostWeight < lowestCost) {
        lowestCost = placementCost;
        bestNode = n;
      }
    }

    let decision = "don't migrate";
    let reason = "no better clean node found or saving below threshold";

    if (!alternativeEvaluated) {
      reason = "no alternatives evaluated (all alternative nodes over capacity threshold)";
    } else if (bestNode !== currentNode) {
      decision = "migrate";
      reason = "carbon savings exceeded migration threshold";
    }

    const delta = currentPlacementCost - lowestCost;

    // Log the evaluation trigger details
    logDecision({
      type: "rebalance_evaluation",
      key,
      currentNode,
      currentRegion: currentReg,
      currentCarbonIntensity: currentCarbon,
      bestAlternativeNode: bestNode !== currentNode ? bestNode : (altDetails.length > 0 ? altDetails[0].node : "none"),
      alternativeCarbonIntensity: bestNode !== currentNode ? (altDetails.find(a => a.node === bestNode)?.carbon || 0) : 0,
      carbonSavingsDelta: parseFloat(delta.toFixed(2)),
      decision,
      reason,
      alternatives: altDetails
    });

    if (bestNode !== currentNode) {
      // Perform Migration
      try {
        const writeRes = await fetch(`${bestNode}/v1/cache/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value, recomputeCost: cost }),
          signal: AbortSignal.timeout(1000),
        });

        if (writeRes.ok) {
          const deleteRes = await fetch(`${currentNode}/v1/cache/${key}`, {
            method: "DELETE",
            signal: AbortSignal.timeout(1000),
          });

          if (deleteRes.ok) {
            keyLocation[key] = bestNode;
            logDecision({
              type: "migration",
              key,
              sourceNode: currentNode,
              targetNode: bestNode,
              recomputeCost: cost,
              carbonSaved: parseFloat((currentPlacementCost - lowestCost).toFixed(2)),
              details: {
                sourceCost: parseFloat(currentPlacementCost.toFixed(2)),
                targetCost: parseFloat(lowestCost.toFixed(2)),
                migrationCostThreshold: migrationCostWeight,
              },
            });
            console.log(
              `[Rebalancer] Migrated key "${key}" from ${currentNode} to ${bestNode} (saved carbon score: ${(
                currentPlacementCost - lowestCost
              ).toFixed(2)})`
            );
          }
        }
      } catch (err) {
        console.error(`[Rebalancer] Failed to migrate key "${key}": ${err.message}`);
      }
    }
  }
}

const rebalanceInterval = setInterval(runRebalancing, 5000);
rebalanceInterval.unref();

// Routes

app.get("/health", (req, res) => {
  return res.status(200).json({
    status: "ok",
    service: "coordinator",
    timestamp: new Date().toISOString(),
  });
});

app.get("/v1/cluster/status", async (req, res) => {
  const ownership = ring.getOwnershipPercentages();
  const nodesInfo = [];

  for (const node of configuredNodes) {
    const reg = nodeStatus[node].region;
    let carbon = 300;
    try {
      carbon = await carbonService.getCarbonIntensity(reg, simulatedHour);
    } catch (e) {}

    nodesInfo.push({
      node,
      healthy: nodeStatus[node].healthy,
      region: reg,
      vnodes: nodeStatus[node].vnodes,
      keysOwnedPercentage: nodeStatus[node].healthy ? parseFloat((ownership[node] || 0).toFixed(2)) : 0,
      carbonIntensity: carbon,
      items: getNodeItemCount(node),
      capacity: nodeStatus[node].capacity || 100,
    });
  }

  return res.status(200).json({
    status: "ok",
    simulatedHour,
    nodes: nodesInfo,
  });
});

app.get("/v1/cluster/decisions", (req, res) => {
  return res.status(200).json(decisions);
});

app.post("/v1/cluster/rebalance", async (req, res) => {
  await runRebalancing();
  return res.status(200).json({ status: "ok" });
});

// Set simulated time
app.post("/v1/cluster/time", async (req, res) => {
  const { hour } = req.body;
  if (hour !== undefined && hour !== null) {
    simulatedHour = parseInt(hour, 10);

    // Broadcast simulated time to all healthy nodes
    for (const node of configuredNodes) {
      if (nodeStatus[node].healthy) {
        await fetch(`${node}/v1/node/time`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ hour: simulatedHour }),
          signal: AbortSignal.timeout(1000),
        }).catch(() => {});
      }
    }
  }
  return res.status(200).json({ status: "ok", simulatedHour });
});

// Aggregate metrics
app.get("/metrics", async (req, res) => {
  let totalHits = 0;
  let totalMisses = 0;
  let totalItems = 0;
  let totalExpired = 0;

  const nodeMetrics = {};

  for (const node of configuredNodes) {
    if (nodeStatus[node].healthy) {
      try {
        const response = await fetch(`${node}/metrics`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) {
          const data = await response.json();
          totalHits += data.hits || 0;
          totalMisses += data.misses || 0;
          totalItems += data.items || 0;
          totalExpired += data.expired || 0;
          nodeMetrics[node] = data;
        } else {
          nodeMetrics[node] = { error: `HTTP ${response.status}` };
        }
      } catch (err) {
        nodeMetrics[node] = { error: err.message };
      }
    } else {
      nodeMetrics[node] = { error: "unhealthy" };
    }
  }

  const hitRate = totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0;

  return res.status(200).json({
    hits: totalHits,
    misses: totalMisses,
    items: totalItems,
    expired: totalExpired,
    hitRate: parseFloat(hitRate.toFixed(4)),
    nodes: nodeMetrics,
  });
});

app.get("/v1/cache/:key", handleProxy);
app.post("/v1/cache/:key", handleProxy);
app.put("/v1/cache/:key", handleProxy);
app.delete("/v1/cache/:key", handleProxy);

if (require.main === module) {
  const PORT = process.env.PORT || 4000;
  app.listen(PORT, () => console.log(`Coordinator server listening on port ${PORT}`));
}

module.exports = app;

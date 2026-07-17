const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const HashRing = require("./hashRing");
const CarbonDataService = require("./carbonData");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const nodeRegions = {
  "http://localhost:4001": "us-east",
  "http://localhost:4002": "us-west",
  "http://localhost:4003": "eu-central",
};

class SeededRandom {
  constructor(seed) {
    this.seed = seed;
  }
  next() {
    this.seed = (this.seed * 1664525 + 1013904223) % 4294967296;
    return this.seed / 4294967296;
  }
}

class ZipfGenerator {
  constructor(n, alpha = 1.0, seed = 12345) {
    this.n = n;
    this.alpha = alpha;
    this.sum = 0;
    for (let i = 1; i <= n; i++) {
      this.sum += 1 / Math.pow(i, alpha);
    }
    this.rng = new SeededRandom(seed);
  }

  next() {
    const rand = this.rng.next() * this.sum;
    let cumulative = 0;
    for (let i = 1; i <= this.n; i++) {
      cumulative += 1 / Math.pow(i, this.alpha);
      if (rand <= cumulative) {
        return i;
      }
    }
    return this.n;
  }
}

function startCluster(envOverrides) {
  const opts = {
    cwd: path.join(__dirname),
    env: { ...process.env, ...envOverrides },
  };

  const n1 = spawn("node", ["server.js"], {
    ...opts,
    env: { ...opts.env, PORT: 4001, NODE_PORT: 4001, NODE_REGION: "us-east" },
  });
  const n2 = spawn("node", ["server.js"], {
    ...opts,
    env: { ...opts.env, PORT: 4002, NODE_PORT: 4002, NODE_REGION: "us-west" },
  });
  const n3 = spawn("node", ["server.js"], {
    ...opts,
    env: { ...opts.env, PORT: 4003, NODE_PORT: 4003, NODE_REGION: "eu-central" },
  });

  const coord = spawn("node", ["coordinator.js"], {
    ...opts,
    env: {
      ...opts.env,
      PORT: 4000,
      COORDINATOR_NODES: "http://localhost:4001,http://localhost:4002,http://localhost:4003",
    },
  });

  return [n1, n2, n3, coord];
}

function killCluster(processes) {
  for (const p of processes) {
    try {
      p.kill("SIGKILL");
    } catch (e) {}
  }
}

function cleanFiles() {
  try {
    fs.unlinkSync(path.join(__dirname, "decision-log.json"));
  } catch (e) {}
  for (const port of [4001, 4002, 4003]) {
    try {
      fs.unlinkSync(path.join(__dirname, `cache/snapshot-${port}.json`));
    } catch (e) {}
  }
}

async function runSimulation(configName, envOverrides, seed = 12345) {
  cleanFiles();
  console.log(`\n=== Starting Configuration: ${configName} (Seed: ${seed}) ===`);
  const processes = startCluster(envOverrides);

  // Wait for servers to stabilize and perform initial health check
  await delay(3000);

  const totalRequests = 600;
  const requestsPerHour = 25;
  const zipf = new ZipfGenerator(50, 1.0, seed);

  const keyCosts = {};
  for (let i = 1; i <= 50; i++) {
    keyCosts[`key-${i}`] = 1 + (i % 5) * 5; // vary recompute cost: 1, 6, 11, 16, 21
  }

  const vnodes = parseInt(envOverrides.VNODE_COUNT || "150", 10);
  const ring = new HashRing(Object.keys(nodeRegions), { vnodes });
  const carbonService = new CarbonDataService();

  let hits = 0;
  let misses = 0;
  const latencies = [];
  const hitLatencies = [];
  const missLatencies = [];
  let totalRecomputeCO2 = 0;

  for (let r = 0; r < totalRequests; r++) {
    const hour = Math.floor(r / requestsPerHour);

    if (r % requestsPerHour === 0) {
      await fetch("http://localhost:4000/v1/cluster/time", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hour }),
      }).catch(() => {});

      // Trigger rebalance dynamically
      await fetch("http://localhost:4000/v1/cluster/rebalance", {
        method: "POST",
      }).catch(() => {});
    }

    const keyIndex = zipf.next();
    const key = `key-${keyIndex}`;
    const cost = keyCosts[key];

    const start = performance.now();

    try {
      const getRes = await fetch(`http://localhost:4000/v1/cache/${key}`);
      const getDuration = performance.now() - start;

      if (getRes.status === 200) {
        hits++;
        latencies.push(getDuration);
        hitLatencies.push(getDuration);
      } else if (getRes.status === 404) {
        misses++;

        // Calculate carbon emissions of miss based on primary node region
        const primaryNode = ring.getNode(key);
        const region = nodeRegions[primaryNode] || "us-east";
        const carbon = await carbonService.getCarbonIntensity(region, hour);
        totalRecomputeCO2 += cost * carbon;

        // Perform recompute and store (write-back), measuring its latency
        const postStart = performance.now();
        await fetch(`http://localhost:4000/v1/cache/${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ value: `val-${keyIndex}`, recomputeCost: cost }),
        }).catch(() => {});

        const postDuration = performance.now() - postStart;
        const totalMissDuration = getDuration + postDuration;
        latencies.push(totalMissDuration);
        missLatencies.push(totalMissDuration);
      }
    } catch (err) {
      latencies.push(performance.now() - start);
    }
  }

  // Count migrations from decisions log
  let migrations = 0;
  try {
    const decRes = await fetch("http://localhost:4000/v1/cluster/decisions");
    if (decRes.ok) {
      const decs = await decRes.json();
      migrations = decs.filter((d) => d.type === "migration").length;
    }
  } catch (e) {}

  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
  const p99Index = Math.floor(latencies.length * 0.99);
  const p99Latency = latencies[p99Index] || 0;
  const hitRate = hits / totalRequests;

  const avgHit = hitLatencies.length ? (hitLatencies.reduce((a, b) => a + b, 0) / hitLatencies.length) : 0;
  const avgMiss = missLatencies.length ? (missLatencies.reduce((a, b) => a + b, 0) / missLatencies.length) : 0;

  // Total CO2 = Miss Recomputations + (Migrations * 50 gCO2 overhead)
  const migrationCO2Overhead = migrations * 50;
  const totalCO2 = totalRecomputeCO2 + migrationCO2Overhead;

  console.log(`Completed ${configName}`);
  console.log(`- Hit Rate: ${(hitRate * 100).toFixed(2)}%`);
  console.log(`- Avg Latency: ${avgLatency.toFixed(2)} ms`);
  console.log(`- Avg Hit Latency: ${avgHit.toFixed(2)} ms`);
  console.log(`- Avg Miss Latency: ${avgMiss.toFixed(2)} ms`);
  console.log(`- p99 Latency: ${p99Latency.toFixed(2)} ms`);
  console.log(`- Total CO2: ${totalCO2.toFixed(2)} g`);
  console.log(`- Migrations: ${migrations}`);

  killCluster(processes);
  await delay(2500); // Wait for processes to release ports

  return {
    Configuration: configName,
    "Hit Rate (%)": parseFloat((hitRate * 100).toFixed(2)),
    "Avg Latency (ms)": parseFloat(avgLatency.toFixed(2)),
    "p99 Latency (ms)": parseFloat(p99Latency.toFixed(2)),
    "Total CO2 (g)": parseFloat(totalCO2.toFixed(2)),
    Migrations: migrations,
  };
}

async function main() {
  // Terminate any previous runs
  const cleanProcess = spawn("kill", ["-9", "$(lsof -t -i:4000,4001,4002,4003)"], { shell: true });
  await new Promise((r) => cleanProcess.on("exit", r));
  await delay(500);

  const results = [];

  const seedA = 12345;
  const seedB = 67890;
  const seedC = 54321;

  // Configuration 1: Plain consistent hashing + LRU (baseline)
  const config1 = await runSimulation("1. Consistent Hashing + LRU (Baseline)", {
    CACHE_CAPACITY: "10",
    WEIGHT_RECENCY: "1.0",
    WEIGHT_FREQUENCY: "0.0",
    WEIGHT_COST: "0.0",
    CARBON_AWARE_EVICTION: "false",
    COORDINATOR_ROUTING_PENALTY: "999999", // disable off-ring placement
    COORDINATOR_MIGRATION_COST: "999999", // disable migrations
    VNODE_COUNT: "150",
  }, seedA);
  results.push(config1);

  // Configuration 2: Cost-aware eviction only, plain consistent hashing
  const config2 = await runSimulation("2. Cost-Aware Eviction + Plain Hashing", {
    CACHE_CAPACITY: "10",
    WEIGHT_RECENCY: "1.0",
    WEIGHT_FREQUENCY: "1.0",
    WEIGHT_COST: "2.0",
    CARBON_AWARE_EVICTION: "false",
    COORDINATOR_ROUTING_PENALTY: "999999",
    COORDINATOR_MIGRATION_COST: "999999",
    VNODE_COUNT: "150",
  }, seedA);
  results.push(config2);

  // Configuration 3: Full carbon-aware eviction + placement
  const config3 = await runSimulation("3. Carbon-Aware Placement + Eviction + Rebalancing", {
    CACHE_CAPACITY: "10",
    WEIGHT_RECENCY: "1.0",
    WEIGHT_FREQUENCY: "1.0",
    WEIGHT_COST: "2.0",
    CARBON_AWARE_EVICTION: "true",
    COORDINATOR_ROUTING_PENALTY: "150",
    COORDINATOR_MIGRATION_COST: "100",
    VNODE_COUNT: "150",
  }, seedA);
  results.push(config3);

  const config4_opts = {
    CACHE_CAPACITY: "10",
    WEIGHT_RECENCY: "1.0",
    WEIGHT_FREQUENCY: "1.0",
    WEIGHT_COST: "2.0",
    CARBON_AWARE_EVICTION: "true",
    COORDINATOR_ROUTING_PENALTY: "150",
    COORDINATOR_MIGRATION_COST: "100",
    PLACEMENT_STRATEGY: "carbon_capacity_aware",
    PLACEMENT_CAPACITY_THRESHOLD: "0.8",
    VNODE_COUNT: "150",
  };

  const config5_opts = {
    CACHE_CAPACITY: "10",
    WEIGHT_RECENCY: "1.0",
    WEIGHT_FREQUENCY: "1.0",
    WEIGHT_COST: "2.0",
    CARBON_AWARE_EVICTION: "true",
    COORDINATOR_ROUTING_PENALTY: "150",
    COORDINATOR_MIGRATION_COST: "100",
    PLACEMENT_STRATEGY: "carbon_capacity_aware",
    PLACEMENT_CAPACITY_THRESHOLD: "0.8",
    MIGRATION_CAPACITY_THRESHOLD: "0.9",
    VNODE_COUNT: "150",
  };

  // Configuration 4: Carbon-aware placement + eviction + rebalancing (Capacity-Balanced)
  const config4 = await runSimulation("4. Carbon-Aware Placement + Eviction + Rebalancing (Capacity-Balanced)", config4_opts, seedA);
  results.push(config4);

  // Configuration 5: Carbon-aware placement + eviction + rebalancing (Dual-Threshold)
  const config5 = await runSimulation("5. Carbon-Aware Placement + Eviction + Rebalancing (Dual-Threshold)", config5_opts, seedA);
  results.push(config5);

  console.log("\n=== EVALUATION REPORT SUMMARY ===");
  console.table(results);

  console.log("\n=== RUNNING ADDITIONAL SEEDS FOR CONFIG 4 & 5 COMPARISON ===");
  const res4_B = await runSimulation("4. Capacity-Balanced (Seed B)", config4_opts, seedB);
  const res5_B = await runSimulation("5. Dual-Threshold (Seed B)", config5_opts, seedB);

  const res4_C = await runSimulation("4. Capacity-Balanced (Seed C)", config4_opts, seedC);
  const res5_C = await runSimulation("5. Dual-Threshold (Seed C)", config5_opts, seedC);

  console.log("\n=== MULTI-SEED CO2 COMPARISON ===");
  console.log(`Seed A (${seedA}): Config 4 CO2 = ${config4["Total CO2 (g)"]} g | Config 5 CO2 = ${config5["Total CO2 (g)"]} g`);
  console.log(`Seed B (${seedB}): Config 4 CO2 = ${res4_B["Total CO2 (g)"]} g | Config 5 CO2 = ${res5_B["Total CO2 (g)"]} g`);
  console.log(`Seed C (${seedC}): Config 4 CO2 = ${res4_C["Total CO2 (g)"]} g | Config 5 CO2 = ${res5_C["Total CO2 (g)"]} g`);

  console.log("\n=== RUNNING EXPERIMENT: NORMAL LOAD CLUSTER (SLACK ENABLED, CACHE_CAPACITY=15) ===");
  const slack_res4_A = await runSimulation("4. Capacity-Balanced (Slack, Seed A)", { ...config4_opts, CACHE_CAPACITY: "15" }, seedA);
  const slack_res5_A = await runSimulation("5. Dual-Threshold (Slack, Seed A)", { ...config5_opts, CACHE_CAPACITY: "15" }, seedA);

  const slack_res4_B = await runSimulation("4. Capacity-Balanced (Slack, Seed B)", { ...config4_opts, CACHE_CAPACITY: "15" }, seedB);
  const slack_res5_B = await runSimulation("5. Dual-Threshold (Slack, Seed B)", { ...config5_opts, CACHE_CAPACITY: "15" }, seedB);

  const slack_res4_C = await runSimulation("4. Capacity-Balanced (Slack, Seed C)", { ...config4_opts, CACHE_CAPACITY: "15" }, seedC);
  const slack_res5_C = await runSimulation("5. Dual-Threshold (Slack, Seed C)", { ...config5_opts, CACHE_CAPACITY: "15" }, seedC);

  console.log("\n=== SLACK-ENABLED MULTI-SEED CO2 COMPARISON (CAPACITY = 15) ===");
  console.log(`Seed A (${seedA}): Config 4 (Slack) CO2 = ${slack_res4_A["Total CO2 (g)"]} g, Migrations = ${slack_res4_A.Migrations} | Config 5 (Slack) CO2 = ${slack_res5_A["Total CO2 (g)"]} g, Migrations = ${slack_res5_A.Migrations}`);
  console.log(`Seed B (${seedB}): Config 4 (Slack) CO2 = ${slack_res4_B["Total CO2 (g)"]} g, Migrations = ${slack_res4_B.Migrations} | Config 5 (Slack) CO2 = ${slack_res5_B["Total CO2 (g)"]} g, Migrations = ${slack_res5_B.Migrations}`);
  console.log(`Seed C (${seedC}): Config 4 (Slack) CO2 = ${slack_res4_C["Total CO2 (g)"]} g, Migrations = ${slack_res4_C.Migrations} | Config 5 (Slack) CO2 = ${slack_res5_C["Total CO2 (g)"]} g, Migrations = ${slack_res5_C.Migrations}`);

  // Save to JSON
  const outputDir = path.join(__dirname, "../../docs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(path.join(outputDir, "sim-results.json"), JSON.stringify(results, null, 2));

  // Save to CSV
  const csvHeaders = Object.keys(results[0]).join(",");
  const csvRows = results.map((row) => Object.values(row).join(",")).join("\n");
  const csvContent = `${csvHeaders}\n${csvRows}`;
  fs.writeFileSync(path.join(outputDir, "sim-results.csv"), csvContent);
  console.log(`Saved evaluation results to docs/sim-results.json and docs/sim-results.csv`);
}

main().catch(console.error);

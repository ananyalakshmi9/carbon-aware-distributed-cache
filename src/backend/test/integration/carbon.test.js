const { spawn } = require("child_process");
const path = require("path");
const request = require("supertest");
const fs = require("fs");
const CarbonDataService = require("../../carbonData");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Carbon-Aware Distributed Cache Integration Tests", () => {
  let node1, node2, node3, coordinator;
  const node1Port = 4021;
  const node2Port = 4022;
  const node3Port = 4023;
  const coordPort = 4020;

  const node1Url = `http://localhost:${node1Port}`;
  const node2Url = `http://localhost:${node2Port}`;
  const node3Url = `http://localhost:${node3Port}`;
  const coordUrl = `http://localhost:${coordPort}`;

  const spawnedProcesses = [];

  function spawnNode(port, region) {
    const p = spawn("node", ["server.js"], {
      cwd: path.join(__dirname, "../.."),
      env: {
        ...process.env,
        NODE_PORT: port,
        NODE_REGION: region,
        CARBON_AWARE_EVICTION: "true",
      },
    });

    p.on("error", (err) => {
      console.error(`Failed to start node on port ${port}:`, err);
    });

    spawnedProcesses.push(p);
    return p;
  }

  function spawnCoordinator(port, nodes) {
    const p = spawn("node", ["coordinator.js"], {
      cwd: path.join(__dirname, "../.."),
      env: {
        ...process.env,
        PORT: port,
        COORDINATOR_NODES: nodes.join(","),
        VNODE_COUNT: 10,
        COORDINATOR_ROUTING_PENALTY: "100", // lower penalty to make carbon differences trigger routing shifts
        COORDINATOR_COST_SCALE: "1.0",
        COORDINATOR_MIGRATION_COST: "20", // lower migration threshold for testing
      },
    });

    p.on("error", (err) => {
      console.error(`Failed to start coordinator on port ${port}:`, err);
    });

    spawnedProcesses.push(p);
    return p;
  }

  beforeAll(async () => {
    const logPath = path.join(__dirname, "../../decision-log.json");
    if (fs.existsSync(logPath)) {
      try {
        fs.unlinkSync(logPath);
      } catch (e) {}
    }
    const cacheDir = path.join(__dirname, "../../cache");
    for (const port of [node1Port, node2Port, node3Port]) {
      const snapPath = path.join(cacheDir, `snapshot-${port}.json`);
      if (fs.existsSync(snapPath)) {
        try {
          fs.unlinkSync(snapPath);
        } catch (e) {}
      }
    }

    node1 = spawnNode(node1Port, "us-east");
    node2 = spawnNode(node2Port, "us-west");
    node3 = spawnNode(node3Port, "eu-central");

    coordinator = spawnCoordinator(coordPort, [node1Url, node2Url, node3Url]);

    await delay(3000); // Wait for servers to be healthy
  }, 12000);

  afterAll(async () => {
    for (const p of spawnedProcesses) {
      try {
        p.kill("SIGKILL");
      } catch (e) {}
    }
    await delay(500);
  });

  test("CarbonDataService mock curves behavior", async () => {
    const carbonService = new CarbonDataService();

    // Hour 0: us-west should be lowest (50), eu-central (300), us-east (571)
    const west0 = await carbonService.getCarbonIntensity("us-west", 0);
    const central0 = await carbonService.getCarbonIntensity("eu-central", 0);
    expect(west0).toBe(50);
    expect(central0).toBe(300);

    // Hour 12: us-west should be highest (400), eu-central (100)
    const west12 = await carbonService.getCarbonIntensity("us-west", 12);
    const central12 = await carbonService.getCarbonIntensity("eu-central", 12);
    expect(west12).toBe(400);
    expect(central12).toBe(100);
  });

  test("Carbon-Aware Placement routes to lowest carbon region", async () => {
    // Set time to hour 0 (us-west is lowest carbon at 50)
    await request(coordUrl).post("/v1/cluster/time").send({ hour: 0 });

    // Store a key with high recomputeCost
    const postRes = await request(coordUrl)
      .post("/v1/cache/carbonKey")
      .send({ value: "green-payload", recomputeCost: 15 });

    expect(postRes.status).toBe(201);

    // Verify key was placed in node2 (us-west)
    const node2Res = await request(node2Url).get("/v1/cache/carbonKey");
    expect(node2Res.status).toBe(200);
    expect(node2Res.body.value).toBe("green-payload");

    // Other nodes should not have it
    const node1Res = await request(node1Url).get("/v1/cache/carbonKey");
    const node3Res = await request(node3Url).get("/v1/cache/carbonKey");
    expect(node1Res.status).toBe(404);
    expect(node3Res.status).toBe(404);
  });

  test("Carbon-Aware Migration triggers rebalancing", async () => {
    // Set simulated hour to 12 (eu-central / node3 is lowest carbon at 100, us-west / node2 is 400)
    await request(coordUrl).post("/v1/cluster/time").send({ hour: 12 });

    // Wait for the rebalancer to run (it runs every 5 seconds)
    // We wait 6 seconds
    await delay(6000);

    // The key "carbonKey" should have migrated from node2 (us-west) to node3 (eu-central)
    const node3Res = await request(node3Url).get("/v1/cache/carbonKey");
    expect(node3Res.status).toBe(200);
    expect(node3Res.body.value).toBe("green-payload");

    // The key should have been deleted from node2 (us-west)
    const node2Res = await request(node2Url).get("/v1/cache/carbonKey");
    expect(node2Res.status).toBe(404);

    // Check decisions log
    const decisionsRes = await request(coordUrl).get("/v1/cluster/decisions");
    expect(decisionsRes.status).toBe(200);
    expect(decisionsRes.body.length).toBeGreaterThanOrEqual(2); // 1 for placement, 1 for migration

    const migration = decisionsRes.body.find((d) => d.type === "migration");
    expect(migration).toBeDefined();
    expect(migration.key).toBe("carbonKey");
    expect(migration.sourceNode).toBe(node2Url);
    expect(migration.targetNode).toBe(node3Url);
  }, 10000);
});

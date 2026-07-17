const { spawn } = require("child_process");
const path = require("path");
const request = require("supertest");

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Coordinator Integration Tests", () => {
  let node1, node2, node3, coordinator;
  const node1Port = 4011;
  const node2Port = 4012;
  const node3Port = 4013;
  const coordPort = 4010;

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
        // Make sure snapshot filenames are isolated
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
        VNODE_COUNT: 10, // Small vnode count for faster tests
      },
    });

    p.on("error", (err) => {
      console.error(`Failed to start coordinator on port ${port}:`, err);
    });

    spawnedProcesses.push(p);
    return p;
  }

  beforeAll(async () => {
    // Clean up any potential files or processes
    node1 = spawnNode(node1Port, "us-east");
    node2 = spawnNode(node2Port, "us-west");
    node3 = spawnNode(node3Port, "eu-central");

    coordinator = spawnCoordinator(coordPort, [node1Url, node2Url, node3Url]);

    // Give servers 2.5 seconds to start up and perform initial health check
    await delay(2500);
  }, 10000);

  afterAll(async () => {
    // Terminate all spawned processes
    for (const p of spawnedProcesses) {
      try {
        p.kill("SIGKILL");
      } catch (e) {
        // ignore
      }
    }
    await delay(500);
  });

  test("Coordinator health check", async () => {
    const res = await request(coordUrl).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("coordinator");
  });

  test("Cluster status shows 3 healthy nodes", async () => {
    const res = await request(coordUrl).get("/v1/cluster/status");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.nodes).toHaveLength(3);

    const nodes = res.body.nodes;
    const n1 = nodes.find((n) => n.node === node1Url);
    const n2 = nodes.find((n) => n.node === node2Url);
    const n3 = nodes.find((n) => n.node === node3Url);

    expect(n1.healthy).toBe(true);
    expect(n1.region).toBe("us-east");

    expect(n2.healthy).toBe(true);
    expect(n2.region).toBe("us-west");

    expect(n3.healthy).toBe(true);
    expect(n3.region).toBe("eu-central");

    // Total ownership percentage should sum to approximately 100%
    const totalPercentage = nodes.reduce((sum, n) => sum + n.keysOwnedPercentage, 0);
    expect(totalPercentage).toBeCloseTo(100, 0);
  });

  test("Route requests to nodes and read metrics", async () => {
    // 1. Store a key via coordinator
    const postRes = await request(coordUrl).post("/v1/cache/helloKey").send({ value: "world" });
    expect(postRes.status).toBe(201);
    expect(postRes.body.key).toBe("helloKey");
    expect(postRes.body.value).toBe("world");

    // 2. Retrieve key via coordinator
    const getRes = await request(coordUrl).get("/v1/cache/helloKey");
    expect(getRes.status).toBe(200);
    expect(getRes.body.value).toBe("world");

    // 3. Find out where it got stored by checking nodes directly
    let foundNode = null;
    for (const url of [node1Url, node2Url, node3Url]) {
      const nodeRes = await request(url).get("/v1/cache/helloKey");
      if (nodeRes.status === 200) {
        foundNode = url;
        break;
      }
    }
    expect(foundNode).not.toBeNull();

    // 4. Retrieve metrics from coordinator and verify matches
    const metricsRes = await request(coordUrl).get("/metrics");
    expect(metricsRes.status).toBe(200);
    expect(metricsRes.body.items).toBeGreaterThanOrEqual(1);
    expect(metricsRes.body.hits).toBeGreaterThanOrEqual(1);
    expect(metricsRes.body.nodes[foundNode].items).toBe(1);
  });

  test("Survive a node being killed and restarted", async () => {
    // 1. Find a key that routes to node2
    let keyToNode2 = null;
    for (let i = 0; i < 50; i++) {
      const key = `key-test-${i}`;
      // Direct request to coord status to see ring lookup isn't exposed, but we can hit the actual routing
      // Let's store the key, then see where it went
      await request(coordUrl).post(`/v1/cache/${key}`).send({ value: "test" });
      const n2Get = await request(node2Url).get(`/v1/cache/${key}`);
      if (n2Get.status === 200) {
        keyToNode2 = key;
        break;
      }
    }

    expect(keyToNode2).not.toBeNull();

    // 2. Kill Node 2
    node2.kill("SIGKILL");
    // Wait for next coordinator health check loop (takes ~1s)
    await delay(1500);

    // 3. Status should show Node 2 as unhealthy
    const statusRes = await request(coordUrl).get("/v1/cluster/status");
    const n2Status = statusRes.body.nodes.find((n) => n.node === node2Url);
    expect(n2Status.healthy).toBe(false);

    // 4. Retrieving keyToNode2 now should return 404 because the ring maps it to a new node,
    // which does not have the key yet. (But it should NOT hang or 502/503!)
    const getResAfterKill = await request(coordUrl).get(`/v1/cache/${keyToNode2}`);
    expect(getResAfterKill.status).toBe(404);

    // 5. Restart Node 2 on the same port
    node2 = spawnNode(node2Port, "us-west");
    // Wait for node to start up and coordinator to detect health
    await delay(2500);

    // 6. Status should show Node 2 as healthy again
    const statusRes2 = await request(coordUrl).get("/v1/cluster/status");
    const n2Status2 = statusRes2.body.nodes.find((n) => n.node === node2Url);
    expect(n2Status2.healthy).toBe(true);
  }, 15000);
});

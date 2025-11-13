// src/backend/test/integration/health.metrics.test.js
const request = require("supertest");
const app = require("../../server");

describe("Health & Metrics API Integration", () => {
  it("should return OK from /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("should return valid metrics", async () => {
    await request(app).get("/v1/cache/unknown"); // miss
    await request(app).post("/v1/cache/key1").send({ value: "1" });
    await request(app).get("/v1/cache/key1"); // hit

    const res = await request(app).get("/metrics");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("hits");
    expect(res.body).toHaveProperty("misses");
    expect(res.body).toHaveProperty("items");
  });
});

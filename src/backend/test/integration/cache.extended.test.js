const request = require("supertest");
const app = require("../../server");

describe("Extended Cache API Tests", () => {
  test("Should reject missing value on POST", async () => {
    const res = await request(app).post("/v1/cache/invalid").send({});
    expect(res.status).toBe(400);
  });

  test("Should overwrite existing key correctly", async () => {
    await request(app).post("/v1/cache/overwrite").send({ value: "old" });
    await request(app).post("/v1/cache/overwrite").send({ value: "new" });

    const res = await request(app).get("/v1/cache/overwrite");
    expect(res.status).toBe(200);
    expect(res.body.value).toBe("new");
  });

  test("Should maintain correct hit and miss count in metrics", async () => {
    await request(app).get("/v1/cache/notfound123"); // miss
    await request(app).post("/v1/cache/statKey").send({ value: "data" });
    await request(app).get("/v1/cache/statKey"); // hit

    const metrics = await request(app).get("/metrics");
    expect(metrics.status).toBe(200);
    expect(metrics.body.hits).toBeGreaterThanOrEqual(1);
    expect(metrics.body.misses).toBeGreaterThanOrEqual(1);
  });
});

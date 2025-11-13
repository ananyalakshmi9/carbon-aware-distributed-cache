const request = require("supertest");
const app = require("../../server");

describe("Server Routes – High Coverage Tests", () => {

  test("POST /v1/cache/:key should reject missing value", async () => {
    const res = await request(app).post("/v1/cache/a").send({});
    expect(res.status).toBe(400);
  });

  test("POST /v1/cache should overwrite existing key", async () => {
    await request(app).post("/v1/cache/a").send({ value: "1" });
    await request(app).post("/v1/cache/a").send({ value: "2" });

    const res = await request(app).get("/v1/cache/a");
    expect(res.body.value).toBe("2");
  });

  test("GET increments hit counter", async () => {
    await request(app).post("/v1/cache/hitKey").send({ value: "hello" });
    await request(app).get("/v1/cache/hitKey");
    await request(app).get("/v1/cache/hitKey");

    const metrics = await request(app).get("/metrics");
    expect(metrics.body.hits).toBeGreaterThanOrEqual(2);
  });

  test("GET after delete should count as miss", async () => {
    await request(app).post("/v1/cache/temp").send({ value: "123" });
    await request(app).delete("/v1/cache/temp");
    await request(app).get("/v1/cache/temp");

    const metrics = await request(app).get("/metrics");
    expect(metrics.body.misses).toBeGreaterThanOrEqual(1);
  });

  test("DELETE existing key works", async () => {
    await request(app).post("/v1/cache/z").send({ value: "bye" });

    const res = await request(app).delete("/v1/cache/z");
    expect(res.status).toBe(200);
    expect(res.body.key).toBe("z");
  });

  test("DELETE non-existing key returns 404", async () => {
    const res = await request(app).delete("/v1/cache/random_404");
    expect(res.status).toBe(404);
  });

  test("Metrics reflect number of keys stored", async () => {
    await request(app).post("/v1/cache/m1").send({ value: "X" });
    await request(app).post("/v1/cache/m2").send({ value: "Y" });

    const metrics = await request(app).get("/metrics");
    expect(metrics.body.items).toBeGreaterThanOrEqual(2);
  });
});

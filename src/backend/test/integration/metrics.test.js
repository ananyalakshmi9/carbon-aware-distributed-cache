const request = require("supertest");
const app = require("../../server");

describe("SCRUM-25: Metrics Endpoint", () => {
  test("Should return required metric fields", async () => {
    const res = await request(app).get("/metrics");

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("hits");
    expect(res.body).toHaveProperty("misses");
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("expired");
  });

  test("Metrics update after operations", async () => {
    await request(app).get("/v1/cache/unknown1"); // miss

    await request(app).post("/v1/cache/m1").send({ value: "123" });
    await request(app).get("/v1/cache/m1"); // hit

    const res = await request(app).get("/metrics");

    expect(res.body.misses).toBeGreaterThanOrEqual(1);
    expect(res.body.hits).toBeGreaterThanOrEqual(1);
  });
});

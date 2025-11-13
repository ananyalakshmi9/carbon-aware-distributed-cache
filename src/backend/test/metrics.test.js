const request = require("supertest");
const app = require("../server");

describe("SCRUM-25: /metrics endpoint", () => {
  it("should return cache statistics with required fields", async () => {
    const res = await request(app).get("/metrics");
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty("hits");
    expect(res.body).toHaveProperty("misses");
    expect(res.body).toHaveProperty("items");
    expect(res.body).toHaveProperty("expired");
  });
});

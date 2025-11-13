const request = require("supertest");
const app = require("../server");

describe("SCRUM-12: /health endpoint", () => {
  it("should return service status OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("service", "simple-cache");
    expect(res.body).toHaveProperty("timestamp");
  });
});

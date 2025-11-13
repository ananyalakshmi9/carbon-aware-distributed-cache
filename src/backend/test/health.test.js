const request = require("supertest");
const app = require("../server");

describe("Health Endpoint", () => {
  it("should return service status OK", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
  });
});

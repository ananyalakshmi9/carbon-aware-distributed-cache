const request = require("supertest");
const app = require("../server");

describe("Edge Case Tests – Health & Cache", () => {
  test("Health endpoint returns proper JSON structure", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.service).toBe("simple-cache");
    expect(typeof res.body.timestamp).toBe("string");
  });

  test("POST without value should return 400", async () => {
    const res = await request(app).post("/v1/cache/testKey");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Value is required");
  });
});

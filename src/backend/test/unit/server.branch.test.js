// src/backend/test/unit/server.branch.test.js
const request = require("supertest");
const app = require("../../server");

describe("Server Branch Coverage", () => {
  test("POST /v1/cache without value returns 400", async () => {
    const res = await request(app).post("/v1/cache/key1").send({});
    expect(res.status).toBe(400);
  });

  test("GET /v1/cache unknown key returns 404", async () => {
    const res = await request(app).get("/v1/cache/notfound");
    expect(res.status).toBe(404);
  });

  test("DELETE /v1/cache non-existent key returns 404", async () => {
    const res = await request(app).delete("/v1/cache/nothing");
    expect(res.status).toBe(404);
  });
});

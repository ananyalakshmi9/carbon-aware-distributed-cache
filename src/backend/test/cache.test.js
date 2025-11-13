const request = require("supertest");
const app = require("../server");

describe("SCRUM-13 & SCRUM-14 Cache Tests", () => {

  test("Retrieve existing key (SCRUM-13)", async () => {
    await request(app).post("/v1/cache/testKey").send({ value: "hello" });
    const res = await request(app).get("/v1/cache/testKey");

    expect(res.status).toBe(200);
    expect(res.body.key).toBe("testKey");
    expect(res.body.value).toBe("hello");
  });

  test("Retrieve non-existent key returns 404", async () => {
    const res = await request(app).get("/v1/cache/unknownKey");
    expect(res.status).toBe(404);
  });

  test("Delete existing key (SCRUM-14)", async () => {
    await request(app).post("/v1/cache/delKey").send({ value: "bye" });
    const res = await request(app).delete("/v1/cache/delKey");

    expect(res.status).toBe(200);
    expect(res.body.key).toBe("delKey");
  });

  test("Delete non-existent key returns 404", async () => {
    const res = await request(app).delete("/v1/cache/doesNotExist");
    expect(res.status).toBe(404);
  });

});

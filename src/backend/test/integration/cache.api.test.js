const request = require("supertest");
const app = require("../../server");

describe("Cache API – SCRUM-11,13,14", () => {
  test("POST stores a value", async () => {
    const res = await request(app)
      .post("/v1/cache/a")
      .send({ value: "hello" });

    expect(res.status).toBe(201);
  });

  test("GET retrieves stored value", async () => {
    await request(app).post("/v1/cache/b").send({ value: "world" });

    const res = await request(app).get("/v1/cache/b");
    expect(res.status).toBe(200);
    expect(res.body.value).toBe("world");
  });

  test("GET unknown key → 404", async () => {
    const res = await request(app).get("/v1/cache/doesnotexist");
    expect(res.status).toBe(404);
  });

  test("DELETE existing key", async () => {
    await request(app).post("/v1/cache/d1").send({ value: "bye" });
    const del = await request(app).delete("/v1/cache/d1");

    expect(del.status).toBe(200);
  });

  test("DELETE unknown key → 404", async () => {
    const res = await request(app).delete("/v1/cache/notfound");
    expect(res.status).toBe(404);
  });
});

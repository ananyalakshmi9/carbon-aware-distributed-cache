const request = require("supertest");
const app = require("../../server");

describe("Bulk Load Stress Tests", () => {
  test("Insert 50 keys", async () => {
    for (let i = 1; i <= 50; i++) {
      const res = await request(app)
        .post(`/v1/cache/key${i}`)
        .send({ value: `value${i}` });

      expect(res.status).toBe(201);
    }
  });

  test("Retrieve all 50 keys", async () => {
    for (let i = 1; i <= 50; i++) {
      const res = await request(app).get(`/v1/cache/key${i}`);

      expect(res.status).toBe(200);
      expect(res.body.value).toBe(`value${i}`);
    }
  });
});

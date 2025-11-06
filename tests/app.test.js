const request = require('supertest');
const app =require('../src/app');     // Note the ../ path
const cache = require('../src/cache'); // Note the ../ path

const TEST_KEY = 'mykey';
const TEST_VALUE = 'myvalue';

// Clear the cache before each test
beforeEach(() => {
  cache.clear();
});

// SCRUM-13 (GET) Tests
describe('GET /v1/cache/:key (SCRUM-13)', () => {
  it('GIVEN "mykey" exists and has not expired WHEN I send GET THEN return 200 OK', async () => {
    cache.set(TEST_KEY, TEST_VALUE, 60); // 60-second TTL
    const res = await request(app).get(`/v1/cache/${TEST_KEY}`);
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe(TEST_VALUE);
  });

  it('GGIVEN "mykey" does not exist WHEN I send GET THEN return 404', async () => {
    const res = await request(app).get('/v1/cache/non-existing-key');
    expect(res.statusCode).toBe(404);
  });

  it('GIVEN "mykey" has expired WHEN I send GET THEN return 404', async () => {
    cache.set(TEST_KEY, TEST_VALUE, -1); // Instantly expired
    const res = await request(app).get(`/v1/cache/${TEST_KEY}`);
    expect(res.statusCode).toBe(404);
  });
});

// SCRUM-14 (DELETE) Tests
describe('DELETE /v1/cache/:key (SCRUM-14)', () => {
  it('GIVEN "mykey" exists WHEN I send DELETE THEN return 204', async () => {
    cache.set(TEST_KEY, TEST_VALUE, 60);
    const res = await request(app).delete(`/v1/cache/${TEST_KEY}`);
    expect(res.statusCode).toBe(204);
    
    // Verify it's gone
    const getRes = await request(app).get(`/v1/cache/${TEST_KEY}`);
    expect(getRes.statusCode).toBe(404);
  });

  it('GIVEN "mykey" does not exist WHEN I send DELETE THEN return 404', async () => {
    const res = await request(app).delete('/v1/cache/non-existing-key');
    expect(res.statusCode).toBe(404);
  });
});
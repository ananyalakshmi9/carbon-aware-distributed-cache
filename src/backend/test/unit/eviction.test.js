const Cache = require("../../cache/cache");

describe("Cache Eviction Logic Tests", () => {
  test("Plain LRU Eviction (wRecency = 1, wFrequency = 0, wCost = 0)", () => {
    const cache = new Cache();
    cache.capacity = 3;
    cache.wRecency = 1;
    cache.wFrequency = 0;
    cache.wCost = 0;

    // Set 3 keys
    cache.set("k1", "val1"); // clock = 1
    cache.set("k2", "val2"); // clock = 2
    cache.set("k3", "val3"); // clock = 3

    // Access k1 to make it most recent
    cache.get("k1"); // clock = 4

    // Set a 4th key, should evict k2 (oldest access: clock=2)
    cache.set("k4", "val4"); // clock = 5

    expect(cache.get("k1")).toBe("val1");
    expect(cache.get("k2")).toBeNull(); // evicted!
    expect(cache.get("k3")).toBe("val3");
    expect(cache.get("k4")).toBe("val4");
    expect(cache.evictions).toBe(1);
  });

  test("Cost-Weighted Eviction (wRecency = 0, wFrequency = 0, wCost = 1)", () => {
    const cache = new Cache();
    cache.capacity = 3;
    cache.wRecency = 0;
    cache.wFrequency = 0;
    cache.wCost = 1;

    // Set 3 keys with different costs
    cache.set("k1", "val1", 10.0);
    cache.set("k2", "val2", 50.0);
    cache.set("k3", "val3", 5.0);

    // Access k3 (doesn't matter since wRecency is 0)
    cache.get("k3");

    // Set k4, should evict k3 (lowest cost: 5.0)
    cache.set("k4", "val4", 100.0);

    expect(cache.get("k1")).toBe("val1");
    expect(cache.get("k2")).toBe("val2");
    expect(cache.get("k3")).toBeNull(); // evicted!
    expect(cache.get("k4")).toBe("val4");
    expect(cache.evictions).toBe(1);
  });

  test("Weighted combination (LRU + Cost)", () => {
    const cache = new Cache();
    cache.capacity = 3;
    cache.wRecency = 1;
    cache.wFrequency = 0;
    cache.wCost = 10;

    // k1: cost = 2, score = 1 * lastAccess + 10 * 2 = lastAccess + 20
    // k2: cost = 1, score = 1 * lastAccess + 10 * 1 = lastAccess + 10
    // k3: cost = 2, score = 1 * lastAccess + 10 * 2 = lastAccess + 20
    cache.set("k1", "val1", 2); // clock 1, score = 21
    cache.set("k2", "val2", 1); // clock 2, score = 12
    cache.set("k3", "val3", 2); // clock 3, score = 23

    // k2 has the lowest score (12), so it should be evicted.
    cache.set("k4", "val4", 5);

    expect(cache.get("k2")).toBeNull(); // evicted!
    expect(cache.get("k1")).toBe("val1");
    expect(cache.get("k3")).toBe("val3");
  });
});

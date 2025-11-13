// src/backend/test/unit/cache.branch.test.js
const fs = require("fs");
const path = require("path");
const Cache = require("../../cache/cache");

describe("Cache Branch Coverage", () => {
  let cache;
  const snapshotPath = path.join(__dirname, "../../cache/snapshot.json");

  beforeEach(() => {
    cache = new Cache();
    if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  });

  test("loadSnapshot returns false when no snapshot exists", () => {
    expect(cache.loadSnapshot()).toBe(false);
  });

  test("saveSnapshot writes to file", () => {
    cache.set("test", "123");
    expect(cache.saveSnapshot()).toBe(true);
    expect(fs.existsSync(snapshotPath)).toBe(true);
  });

  test("loadSnapshot loads previously saved data", () => {
    cache.set("a", "1");
    cache.saveSnapshot();

    const newCache = new Cache();
    expect(Object.keys(newCache.store).length).toBeGreaterThan(0);
  });
});

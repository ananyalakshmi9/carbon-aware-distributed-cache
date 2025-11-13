const fs = require("fs");
const path = require("path");
const Cache = require("../../cache/cache");

describe("Cache Snapshot (SCRUM-17/18)", () => {
  const snapshotPath = path.join(__dirname, "../../cache/snapshot.json");

  afterEach(() => {
    if (fs.existsSync(snapshotPath)) fs.unlinkSync(snapshotPath);
  });

  test("Should save snapshot file correctly", () => {
    const cache = new Cache();
    cache.set("a", "1");
    cache.saveSnapshot();
    expect(fs.existsSync(snapshotPath)).toBe(true);
  });

  test("Should load snapshot data on restart", () => {
    const cache = new Cache();
    cache.set("x", "100");
    cache.saveSnapshot();

    const newCache = new Cache();
    expect(newCache.get("x")).toBe("100");
  });
});

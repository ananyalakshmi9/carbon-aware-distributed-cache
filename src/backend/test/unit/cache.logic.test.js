const Cache = require("../../cache/cache");

describe("Cache Logic – Unit Tests", () => {
  let cache;

  beforeEach(() => {
    cache = new Cache();
  });

  test("Should store and retrieve a key", () => {
    cache.set("a", "1");
    expect(cache.get("a")).toBe("1");
  });

  test("Should increase hits", () => {
    cache.set("x", "123");
    cache.get("x");
    expect(cache.hits).toBe(1);
  });

  test("Should count misses", () => {
    cache.get("unknown");
    expect(cache.misses).toBe(1);
  });

  test("Should delete a key", () => {
    cache.set("a", "1");
    cache.delete("a");
    expect(cache.get("a")).toBe(null);
  });

  test("Should return false when deleting missing key", () => {
    expect(cache.delete("nope")).toBe(false);
  });

  test("Should store arrays/objects", () => {
    cache.set("arr", [1, 2]);
    cache.set("obj", { a: 1 });

    expect(cache.get("arr")).toEqual([1, 2]);
    expect(cache.get("obj")).toEqual({ a: 1 });
  });

  test("Multiple hits counted", () => {
    cache.set("k", "v");
    cache.get("k");
    cache.get("k");
    cache.get("k");
    expect(cache.hits).toBe(3);
  });

  test("Multiple misses counted", () => {
    cache.get("1");
    cache.get("2");
    cache.get("3");
    expect(cache.misses).toBe(3);
  });
});

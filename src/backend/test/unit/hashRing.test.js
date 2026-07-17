const HashRing = require("../../hashRing");

describe("HashRing Unit Tests", () => {
  test("should initialize empty and return null on lookup", () => {
    const ring = new HashRing();
    expect(ring.getNode("test-key")).toBeNull();
  });

  test("should handle single node and always return it", () => {
    const ring = new HashRing(["node1"]);
    expect(ring.getNode("key1")).toBe("node1");
    expect(ring.getNode("key2")).toBe("node1");
    expect(ring.getNode("another-key")).toBe("node1");
    
    const percentages = ring.getOwnershipPercentages();
    expect(percentages["node1"]).toBe(100);
  });

  test("should route consistently to multiple nodes", () => {
    const ring = new HashRing(["node1", "node2", "node3"]);
    const k1 = ring.getNode("key1");
    const k2 = ring.getNode("key2");
    
    expect(ring.getNode("key1")).toBe(k1);
    expect(ring.getNode("key2")).toBe(k2);
    
    expect(["node1", "node2", "node3"]).toContain(k1);
    expect(["node1", "node2", "node3"]).toContain(k2);
  });

  test("should distribute keys reasonably evenly", () => {
    const ring = new HashRing(["node1", "node2", "node3"], { vnodes: 150 });
    const counts = { node1: 0, node2: 0, node3: 0 };
    
    for (let i = 0; i < 1000; i++) {
      const node = ring.getNode(`key-${i}`);
      counts[node]++;
    }
    
    expect(counts.node1).toBeGreaterThan(150);
    expect(counts.node2).toBeGreaterThan(150);
    expect(counts.node3).toBeGreaterThan(150);
  });

  test("should respect minimal remapping on adding node", () => {
    const ring = new HashRing(["node1", "node2", "node3"], { vnodes: 150 });
    const originalMappings = {};
    for (let i = 0; i < 1000; i++) {
      originalMappings[`key-${i}`] = ring.getNode(`key-${i}`);
    }
    
    ring.addNode("node4");
    
    let remapped = 0;
    for (let i = 0; i < 1000; i++) {
      const key = `key-${i}`;
      const newNode = ring.getNode(key);
      if (newNode !== originalMappings[key]) {
        remapped++;
        expect(newNode).toBe("node4");
      }
    }
    
    expect(remapped).toBeGreaterThan(100);
    expect(remapped).toBeLessThan(400);
  });

  test("should respect minimal remapping on removing node", () => {
    const ring = new HashRing(["node1", "node2", "node3", "node4"], { vnodes: 150 });
    const originalMappings = {};
    for (let i = 0; i < 1000; i++) {
      originalMappings[`key-${i}`] = ring.getNode(`key-${i}`);
    }
    
    ring.removeNode("node4");
    
    let remapped = 0;
    for (let i = 0; i < 1000; i++) {
      const key = `key-${i}`;
      const newNode = ring.getNode(key);
      if (newNode !== originalMappings[key]) {
        remapped++;
        expect(originalMappings[key]).toBe("node4");
        expect(newNode).not.toBe("node4");
      }
    }
    
    const keysMappedToNode4 = Object.values(originalMappings).filter(n => n === "node4").length;
    expect(remapped).toBe(keysMappedToNode4);
  });

  test("should calculate ownership percentages correctly", () => {
    const ring = new HashRing(["node1", "node2"], { vnodes: 5 });
    const percentages = ring.getOwnershipPercentages();
    expect(percentages.node1 + percentages.node2).toBeCloseTo(100, 2);
  });
});

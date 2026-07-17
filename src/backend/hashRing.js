const crypto = require("crypto");

class HashRing {
  constructor(nodes = [], options = {}) {
    this.vnodes = options.vnodes || 150;
    this.ring = []; // Array of { hash, node }
    this.nodes = new Set();

    for (const node of nodes) {
      this.addNode(node);
    }
  }

  _hash(key) {
    const hash = crypto.createHash("sha256").update(key).digest("hex");
    // Parse first 8 hex characters to an unsigned 32-bit integer
    return parseInt(hash.substring(0, 8), 16);
  }

  addNode(node) {
    if (this.nodes.has(node)) return;
    this.nodes.add(node);

    for (let i = 0; i < this.vnodes; i++) {
      const vnodeKey = `${node}#${i}`;
      const hash = this._hash(vnodeKey);
      this.ring.push({ hash, node });
    }

    this.ring.sort((a, b) => a.hash - b.hash);
  }

  removeNode(node) {
    if (!this.nodes.has(node)) return;
    this.nodes.delete(node);
    this.ring = this.ring.filter((item) => item.node !== node);
  }

  getNode(key) {
    if (this.ring.length === 0) return null;
    const hash = this._hash(key);

    let low = 0;
    let high = this.ring.length - 1;
    let index = 0;

    // Find the first vnode on the ring with a hash >= key's hash
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      if (this.ring[mid].hash >= hash) {
        index = mid;
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }

    // If we scanned past the last element, wrap around to the first node
    if (low >= this.ring.length) {
      index = 0;
    }

    return this.ring[index].node;
  }

  getNodes() {
    return Array.from(this.nodes);
  }

  getOwnershipPercentages() {
    if (this.ring.length === 0) return {};
    const percentages = {};
    for (const node of this.nodes) {
      percentages[node] = 0;
    }

    const ringSize = 4294967296; // 2^32

    for (let i = 0; i < this.ring.length; i++) {
      const curr = this.ring[i].hash;
      const prev = i === 0 ? this.ring[this.ring.length - 1].hash : this.ring[i - 1].hash;

      let size;
      if (this.ring.length === 1) {
        size = ringSize;
      } else if (curr >= prev) {
        size = curr - prev;
      } else {
        size = (ringSize - prev) + curr;
      }

      percentages[this.ring[i].node] += size;
    }

    for (const node of this.nodes) {
      percentages[node] = (percentages[node] / ringSize) * 100;
    }

    return percentages;
  }
}

module.exports = HashRing;

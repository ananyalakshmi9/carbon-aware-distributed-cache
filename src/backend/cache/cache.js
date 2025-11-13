const fs = require("fs");
const path = require("path");

class Cache {
  constructor() {
    this.store = {};
    this.hits = 0;
    this.misses = 0;
    this.expired = 0;

    // Auto-restore snapshot (SCRUM-18)
    this.snapshotPath = path.join(__dirname, "snapshot.json");
    this.loadSnapshot();
  }

  set(key, value) {
    this.store[key] = { value };
  }

  get(key) {
    if (!this.store[key]) {
      this.misses++;
      return null;
    }
    this.hits++;
    return this.store[key].value;
  }

  delete(key) {
    if (!this.store[key]) return false;
    delete this.store[key];
    return true;
  }

  // --------------------------------------------
  // SCRUM-17: Save Snapshot to Disk
  // --------------------------------------------
  saveSnapshot() {
    const snapshot = {
      store: this.store,
      hits: this.hits,
      misses: this.misses,
      expired: this.expired,
    };

    fs.writeFileSync(this.snapshotPath, JSON.stringify(snapshot, null, 2));
    return true;
  }

  // --------------------------------------------
  // SCRUM-18: Load Snapshot from Disk on Restart
  // --------------------------------------------
  loadSnapshot() {
    if (fs.existsSync(this.snapshotPath)) {
      const data = JSON.parse(fs.readFileSync(this.snapshotPath));
      this.store = data.store || {};
      this.hits = data.hits || 0;
      this.misses = data.misses || 0;
      this.expired = data.expired || 0;
      return true;
    }
    // 👇 added branch for coverage
    this.store = {};
    return false;
  }
}

module.exports = Cache;

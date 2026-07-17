const fs = require("fs");
const path = require("path");
const CarbonDataService = require("../carbonData");

class Cache {
  constructor() {
    this.store = {};
    this.hits = 0;
    this.misses = 0;
    this.expired = 0;

    // Configurable properties
    this.capacity = parseInt(process.env.CACHE_CAPACITY || "100", 10);
    this.wRecency = parseFloat(process.env.WEIGHT_RECENCY ?? "1.0");
    this.wFrequency = parseFloat(process.env.WEIGHT_FREQUENCY ?? "1.0");
    this.wCost = parseFloat(process.env.WEIGHT_COST ?? "1.0");
    this.defaultRecomputeCost = parseFloat(process.env.DEFAULT_RECOMPUTE_COST ?? "1.0");

    this.logicalClock = 0;
    this.evictions = 0;

    this.region = process.env.NODE_REGION || "unknown";
    this.carbonAwareEviction = process.env.CARBON_AWARE_EVICTION === "true";
    this.currentCarbonIntensity = 300; // baseline
    this.simulatedHour = null;
    this.carbonService = new CarbonDataService();

    // Periodically update carbon intensity
    this.updateCarbonIntensity();
    const carbonCheckInterval = setInterval(() => this.updateCarbonIntensity(), 1000);
    carbonCheckInterval.unref();

    // Auto-restore snapshot (SCRUM-18)
    const portSuffix = process.env.NODE_PORT || process.env.PORT || "";
    const filename = portSuffix ? `snapshot-${portSuffix}.json` : "snapshot.json";
    this.snapshotPath = path.join(__dirname, filename);
    this.loadSnapshot();
  }

  async updateCarbonIntensity() {
    try {
      const hour = this.simulatedHour !== null && this.simulatedHour !== undefined
        ? this.simulatedHour
        : new Date().getHours();
      this.currentCarbonIntensity = await this.carbonService.getCarbonIntensity(this.region, hour);
    } catch (err) {
      // Ignore
    }
  }

  setSimulatedHour(hour) {
    this.simulatedHour = hour;
    this.updateCarbonIntensity();
  }

  calculateScore(key) {
    const item = this.store[key];
    if (!item) return 0;

    const costTerm = this.carbonAwareEviction
      ? item.recomputeCost * this.currentCarbonIntensity
      : item.recomputeCost;

    return (
      this.wRecency * item.lastAccess +
      this.wFrequency * item.accessCount +
      this.wCost * costTerm
    );
  }

  evictLeastScored() {
    let lowestScore = Infinity;
    let keyToEvict = null;

    for (const key of Object.keys(this.store)) {
      const score = this.calculateScore(key);
      if (score < lowestScore) {
        lowestScore = score;
        keyToEvict = key;
      }
    }

    if (keyToEvict) {
      delete this.store[keyToEvict];
      this.evictions++;
      return keyToEvict;
    }
    return null;
  }

  set(key, value, recomputeCost = null) {
    this.logicalClock++;

    const cost =
      recomputeCost !== null && recomputeCost !== undefined
        ? parseFloat(recomputeCost)
        : this.defaultRecomputeCost;

    if (this.store[key]) {
      this.store[key].value = value;
      this.store[key].recomputeCost = cost;
      this.store[key].lastAccess = this.logicalClock;
      this.store[key].accessCount++;
    } else {
      if (Object.keys(this.store).length >= this.capacity) {
        this.evictLeastScored();
      }

      this.store[key] = {
        value,
        recomputeCost: cost,
        lastAccess: this.logicalClock,
        accessCount: 1,
      };
    }
  }

  get(key) {
    this.logicalClock++;
    if (!this.store[key]) {
      this.misses++;
      return null;
    }
    this.hits++;
    this.store[key].lastAccess = this.logicalClock;
    this.store[key].accessCount++;
    return this.store[key].value;
  }

  delete(key) {
    if (!this.store[key]) return false;
    delete this.store[key];
    return true;
  }

  saveSnapshot() {
    const snapshot = {
      store: this.store,
      hits: this.hits,
      misses: this.misses,
      expired: this.expired,
      evictions: this.evictions,
      logicalClock: this.logicalClock,
      simulatedHour: this.simulatedHour,
    };

    fs.writeFileSync(this.snapshotPath, JSON.stringify(snapshot, null, 2));
    return true;
  }

  loadSnapshot() {
    if (fs.existsSync(this.snapshotPath)) {
      const data = JSON.parse(fs.readFileSync(this.snapshotPath));
      this.store = data.store || {};

      for (const key of Object.keys(this.store)) {
        const item = this.store[key];
        if (item && typeof item === "object") {
          if (item.recomputeCost === undefined) item.recomputeCost = this.defaultRecomputeCost;
          if (item.lastAccess === undefined) item.lastAccess = this.logicalClock;
          if (item.accessCount === undefined) item.accessCount = 1;
        }
      }

      this.hits = data.hits || 0;
      this.misses = data.misses || 0;
      this.expired = data.expired || 0;
      this.evictions = data.evictions || 0;
      this.logicalClock = data.logicalClock || 0;
      this.simulatedHour = data.simulatedHour !== undefined ? data.simulatedHour : null;
      this.updateCarbonIntensity();
      return true;
    }
    this.store = {};
    return false;
  }
}

module.exports = Cache;

class Cache {
  constructor() {
    this.store = {};      // { key: { value } }
    this.hits = 0;
    this.misses = 0;
    this.expired = 0;
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
}

module.exports = Cache;

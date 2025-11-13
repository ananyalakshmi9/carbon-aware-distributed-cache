class Cache {
  constructor() {
    this.store = {};
  }

  get(key) {
    return this.store[key] ?? null;
  }

  set(key, value) {
    this.store[key] = value;
  }

  delete(key) {
    delete this.store[key];
  }
}

module.exports = Cache;

// ---------------------------------------------
// Simple In-Memory Cache Class
// ---------------------------------------------

class Cache {
  constructor() {
    this.store = new Map();
  }

  set(key, value) {
    this.store.set(key, value);
  }

  get(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }

  delete(key) {
    if (!this.store.has(key)) return false;
    this.store.delete(key);
    return true;
  }
}

module.exports = Cache;

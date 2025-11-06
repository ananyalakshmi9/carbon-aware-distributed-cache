// A simple in-memory cache class
class SimpleCache {
  constructor() {
    this.cache = new Map();
  }

  // Sets a value in the cache with a Time-to-Live (TTL) in seconds.
  set(key, value, ttl = 60) {
    const expiresAt = Date.now() + (ttl * 1000);
    this.cache.set(key, {
      value: value,
      expiresAt: expiresAt
    });
  }

  // Retrieves a value by its key.
  // Returns null if the key doesn't exist or is expired.
  get(key) {
    const item = this.cache.get(key);
    if (!item) {
      return null;
    }
    if (Date.now() > item.expiresAt) {
      this.cache.delete(key); // Clean up expired key
      return null;
    }
    return item.value;
  }

  // Deletes a key from the cache.
  delete(key) {
    return this.cache.delete(key);
  }

  // Checks if a key exists (used for DELETE).
  has(key) {
    return this.cache.has(key);
  }

  // Helper function to clear the cache for tests.
  clear() {
    this.cache.clear();
  }
}

// Export a single instance
module.exports = new SimpleCache();
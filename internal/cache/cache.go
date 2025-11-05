package cache

import (
    "sync"
    "time"
)

type CacheItem struct {
    Value      []byte
    ExpiryTime time.Time
}

type Cache struct {
    data map[string]CacheItem
    mu   sync.RWMutex
}

// NewCache initializes a new cache instance and starts the cleaner
func NewCache() *Cache {
    c := &Cache{
        data: make(map[string]CacheItem),
    }
    go c.startCleaner() // Start background TTL cleanup
    return c
}

// Put adds a key-value pair with a TTL (in seconds)
func (c *Cache) Put(key string, value []byte, ttlSeconds int) {
    c.mu.Lock()
    defer c.mu.Unlock()

    expiry := time.Now().Add(time.Duration(ttlSeconds) * time.Second)
    c.data[key] = CacheItem{
        Value:      value,
        ExpiryTime: expiry,
    }
}

// Get retrieves a key if it's not expired; deletes and returns false if expired
func (c *Cache) Get(key string) ([]byte, bool) {
    c.mu.RLock()
    item, exists := c.data[key]
    c.mu.RUnlock()

    if !exists {
        return nil, false
    }

    if time.Now().After(item.ExpiryTime) {
        c.Delete(key)
        return nil, false
    }

    return item.Value, true
}

// Delete manually removes a key
func (c *Cache) Delete(key string) {
    c.mu.Lock()
    delete(c.data, key)
    c.mu.Unlock()
}

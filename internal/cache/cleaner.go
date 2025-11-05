package cache

import "time"

// startCleaner runs a background goroutine that deletes expired keys every second
func (c *Cache) startCleaner() {
    ticker := time.NewTicker(1 * time.Second)
    for range ticker.C {
        c.mu.Lock()
        for key, item := range c.data {
            if time.Now().After(item.ExpiryTime) {
                delete(c.data, key)
            }
        }
        c.mu.Unlock()
    }
}

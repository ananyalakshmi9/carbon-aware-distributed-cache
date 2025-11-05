package tests

import (
    "testing"
    "time"

    "github.com/pestechnology/PESU_EC_CSE_A_P76_Simple_Caching_Service_visionaries/internal/cache"
)

func TestTTLExpiry(t *testing.T) {
    c := cache.NewCache()
    c.Put("mykey", []byte("value"), 2)

    time.Sleep(3 * time.Second)
    _, exists := c.Get("mykey")

    if exists {
        t.Errorf("Expected key 'mykey' to expire after TTL, but it still exists")
    }
}

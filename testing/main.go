package main

import (
	"encoding/json"
	"encoding/xml"
	"fmt"
	"net/http"
	"net/http/cookiejar"
	"strings"
	"sync"
	"time"
)

// ---------------- TYPES ----------------

type Restaurant struct {
	Id   string `json:"Id"`
	Name string `json:"Name"`
}

type RSS struct {
	Channel struct {
		Title string `xml:"title"`
		Items []Item `xml:"item"`
	} `xml:"channel"`
}

type Item struct {
	Title       string `xml:"title"`
	Description string `xml:"description"`
	PubDate     string `xml:"pubDate"`
}

// ---------------- CACHE ----------------

type CacheItem struct {
	Data      interface{}
	ExpiresAt time.Time
}

var cache = make(map[string]CacheItem)
var mu sync.Mutex

func setCache(key string, data interface{}, ttl time.Duration) {
	mu.Lock()
	defer mu.Unlock()
	cache[key] = CacheItem{data, time.Now().Add(ttl)}
}

func getCache(key string) (interface{}, bool) {
	mu.Lock()
	defer mu.Unlock()
	item, ok := cache[key]
	if !ok || time.Now().After(item.ExpiresAt) {
		return nil, false
	}
	return item.Data, true
}

// ---------------- UTILS ----------------

func normalizeURL(input string) string {
	input = strings.Replace(input, "aromiv2://", "https://", 1)
	return strings.TrimRight(input, "/")
}

func getBase(url string) string {
	// strip everything after /AromieMenus/.../{instance}
	parts := strings.Split(url, "/Page/")
	return parts[0]
}

// ---------------- CORE ----------------

// Fetch restaurants (modern API)
func fetchRestaurants(client *http.Client, base string) ([]Restaurant, error) {
	cacheKey := base + "_restaurants"
	if data, ok := getCache(cacheKey); ok {
		return data.([]Restaurant), nil
	}

	resp, err := client.Get(base + "/api/Common/Restaurant/GetRestaurants")
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var restaurants []Restaurant
	if err := json.NewDecoder(resp.Body).Decode(&restaurants); err != nil {
		return nil, err
	}

	setCache(cacheKey, restaurants, time.Hour)
	return restaurants, nil
}

// Fetch menu via API RSS
func fetchMenuAPI(client *http.Client, base, id string) (*RSS, error) {
	url := fmt.Sprintf("%s/api/Common/Restaurant/GetRssFeed/%s/0", base, id)

	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rss RSS
	if err := xml.NewDecoder(resp.Body).Decode(&rss); err != nil {
		return nil, err
	}

	return &rss, nil
}

// Fallback RSS (older systems)
func fetchMenuFallback(client *http.Client, base string) (*RSS, error) {
	url := base + "/Rss.aspx?DateMode=1"

	resp, err := client.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var rss RSS
	if err := xml.NewDecoder(resp.Body).Decode(&rss); err != nil {
		return nil, err
	}

	return &rss, nil
}

// ---------------- HANDLERS ----------------

// GET /aroma/restaurants?url=...
func restaurantsHandler(w http.ResponseWriter, r *http.Request) {
	raw := r.URL.Query().Get("url")
	if raw == "" {
		http.Error(w, "missing url", 400)
		return
	}

	url := normalizeURL(raw)
	base := getBase(url)

	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	// init session
	client.Get(base + "/Page/home")

	restaurants, err := fetchRestaurants(client, base)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}

	json.NewEncoder(w).Encode(restaurants)
}

// GET /aroma/menu?url=...&id=...
func menuHandler(w http.ResponseWriter, r *http.Request) {
	raw := r.URL.Query().Get("url")
	id := r.URL.Query().Get("id")

	if raw == "" || id == "" {
		http.Error(w, "missing params", 400)
		return
	}

	url := normalizeURL(raw)
	base := getBase(url)

	cacheKey := base + "_" + id
	if data, ok := getCache(cacheKey); ok {
		json.NewEncoder(w).Encode(data)
		return
	}

	jar, _ := cookiejar.New(nil)
	client := &http.Client{Jar: jar}

	client.Get(base + "/Page/home")

	// try modern API
	rss, err := fetchMenuAPI(client, base, id)

	// fallback if needed
	if err != nil || len(rss.Channel.Items) == 0 {
		rss, err = fetchMenuFallback(client, base)
		if err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
	}

	setCache(cacheKey, rss, 24*time.Hour)
	json.NewEncoder(w).Encode(rss)
}

// ---------------- MAIN ----------------

func main() {
	http.HandleFunc("/aroma/restaurants", restaurantsHandler)
	http.HandleFunc("/aroma/menu", menuHandler)

	fmt.Println("Server running on :8080")
	http.ListenAndServe(":8080", nil)
}

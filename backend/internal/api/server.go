// Package api exposes the content store over HTTP. Read endpoints feed the
// Astro build; write endpoints are token-protected and meant for localhost.
package api

import (
	"crypto/subtle"
	"embed"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
	"time"

	"portfolio/internal/content"
)

const maxBodyBytes = 1 << 20 // 1 MiB is generous for a Markdown document

//go:embed admin/*
var adminFiles embed.FS

// Config controls the HTTP surface.
type Config struct {
	// AdminToken enables the admin API. Empty disables every write endpoint.
	AdminToken string
	// RateLimit is the number of requests per minute allowed per client.
	// Zero disables the limiter (useful in tests).
	RateLimit int
	// ContactRateLimit is the number of contact submissions per hour per client.
	ContactRateLimit int
	// ContactAllowedOrigins lists additional browser origins allowed to call the
	// contact endpoint. The request's own host is always allowed. Empty denies
	// cross-origin browser calls but still allows same-origin and CLI calls.
	ContactAllowedOrigins []string
}

// Server routes requests to the content store.
type Server struct {
	store          *content.Store
	token          string
	limiter        *rateLimiter
	contactLimiter *rateLimiter
	allowedOrigins map[string]struct{}
	mux            *http.ServeMux
}

// New builds the HTTP handler tree.
func New(store *content.Store, cfg Config) *Server {
	allowedOrigins := make(map[string]struct{}, len(cfg.ContactAllowedOrigins))
	for _, origin := range cfg.ContactAllowedOrigins {
		allowedOrigins[origin] = struct{}{}
	}
	server := &Server{
		store:          store,
		token:          cfg.AdminToken,
		limiter:        newRateLimiter(cfg.RateLimit, time.Minute),
		contactLimiter: newRateLimiter(cfg.ContactRateLimit, time.Hour),
		allowedOrigins: allowedOrigins,
		mux:            http.NewServeMux(),
	}

	server.mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	server.mux.HandleFunc("/api/v1/contact", server.handleContactRoute)
	server.mux.HandleFunc("GET /admin", func(w http.ResponseWriter, r *http.Request) {
		http.Redirect(w, r, "/admin/", http.StatusTemporaryRedirect)
	})
	server.mux.HandleFunc("GET /admin/", server.handleAdminUI)

	for _, kind := range []content.Kind{content.KindProject, content.KindArticle} {
		server.mux.HandleFunc("GET /api/v1/"+kind.Path(), server.handleList(kind, false))

		server.mux.Handle("GET /api/v1/admin/"+kind.Path(),
			server.admin(server.handleList(kind, true)))
		server.mux.Handle("POST /api/v1/admin/"+kind.Path(),
			server.admin(http.HandlerFunc(server.handleCreate(kind))))
		server.mux.Handle("GET /api/v1/admin/"+kind.Path()+"/{locale}/{slug}",
			server.admin(http.HandlerFunc(server.handleGet(kind))))
		server.mux.Handle("PUT /api/v1/admin/"+kind.Path()+"/{locale}/{slug}",
			server.admin(http.HandlerFunc(server.handleUpdate(kind))))
		server.mux.Handle("DELETE /api/v1/admin/"+kind.Path()+"/{locale}/{slug}",
			server.admin(http.HandlerFunc(server.handleDelete(kind))))
	}

	return server
}

// Handler returns the root handler with recovery, rate limiting, and headers.
func (s *Server) Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic serving %s %s: %v", r.Method, r.URL.Path, recovered)
				writeError(w, http.StatusInternalServerError, "internal server error")
			}
		}()

		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Cache-Control", "no-store")

		if s.limiter != nil && !s.limiter.allow(clientKey(r)) {
			w.Header().Set("Retry-After", "60")
			writeError(w, http.StatusTooManyRequests, "too many requests")
			return
		}

		s.mux.ServeHTTP(w, r)
	})
}

// handleAdminUI serves the dependency-free browser client. The HTML is public,
// but every content request made by the client still requires the bearer token.
func (s *Server) handleAdminUI(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Security-Policy", "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'")
	w.Header().Set("X-Frame-Options", "DENY")
	w.Header().Set("Referrer-Policy", "no-referrer")

	name := strings.TrimPrefix(r.URL.Path, "/admin/")
	if name == "" {
		name = "index.html"
	}
	contentTypes := map[string]string{
		"index.html": "text/html; charset=utf-8",
		"admin.css":  "text/css; charset=utf-8",
		"admin.js":   "text/javascript; charset=utf-8",
	}
	contentType, ok := contentTypes[name]
	if !ok {
		http.NotFound(w, r)
		return
	}
	asset, err := adminFiles.ReadFile("admin/" + name)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not read admin asset")
		return
	}
	w.Header().Set("Content-Type", contentType)
	w.WriteHeader(http.StatusOK)
	if _, err := w.Write(asset); err != nil {
		log.Printf("write admin asset: %v", err)
	}
}

func (s *Server) handleList(kind content.Kind, includeDrafts bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		locale := r.URL.Query().Get("locale")
		if err := content.ValidateLocale(locale); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		entries, err := s.store.List(r.Context(), kind, locale, includeDrafts)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "could not list entries")
			return
		}
		writeJSON(w, http.StatusOK, map[string]any{"items": entries})
	}
}

func (s *Server) handleCreate(kind content.Kind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var entry content.Entry
		if !decodeJSON(w, r, &entry) {
			return
		}
		entry.Kind = kind
		if err := content.ValidateEntry(&entry); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := s.store.Create(r.Context(), entry); err != nil {
			switch {
			case errors.Is(err, content.ErrConflict):
				writeError(w, http.StatusConflict, "entry already exists")
			default:
				writeError(w, http.StatusInternalServerError, "could not create entry")
			}
			return
		}
		writeJSON(w, http.StatusCreated, entry)
	}
}

func (s *Server) handleGet(kind content.Kind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		locale, slug, ok := pathKeys(w, r)
		if !ok {
			return
		}
		entry, err := s.store.Get(r.Context(), kind, locale, slug)
		if err != nil {
			writeStoreError(w, err, "could not read entry")
			return
		}
		writeJSON(w, http.StatusOK, entry)
	}
}

func (s *Server) handleUpdate(kind content.Kind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		locale, slug, ok := pathKeys(w, r)
		if !ok {
			return
		}
		var payload struct {
			Data json.RawMessage `json:"data"`
			Body string          `json:"body"`
		}
		if !decodeJSON(w, r, &payload) {
			return
		}
		entry := content.Entry{Kind: kind, Locale: locale, Slug: slug, Data: payload.Data, Body: payload.Body}
		if err := content.ValidateEntry(&entry); err != nil {
			writeError(w, http.StatusBadRequest, err.Error())
			return
		}
		if err := s.store.Update(r.Context(), entry); err != nil {
			writeStoreError(w, err, "could not update entry")
			return
		}
		writeJSON(w, http.StatusOK, entry)
	}
}

func (s *Server) handleDelete(kind content.Kind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		locale, slug, ok := pathKeys(w, r)
		if !ok {
			return
		}
		if err := s.store.Delete(r.Context(), kind, locale, slug); err != nil {
			writeStoreError(w, err, "could not delete entry")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}
}

// admin guards every write endpoint with a static bearer token.
func (s *Server) admin(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if s.token == "" {
			writeError(w, http.StatusServiceUnavailable, "admin API is disabled")
			return
		}
		header := r.Header.Get("Authorization")
		provided := strings.TrimPrefix(header, "Bearer ")
		if provided == header || subtle.ConstantTimeCompare([]byte(provided), []byte(s.token)) != 1 {
			w.Header().Set("WWW-Authenticate", `Bearer realm="portfolio-admin"`)
			writeError(w, http.StatusUnauthorized, "unauthorized")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func pathKeys(w http.ResponseWriter, r *http.Request) (locale, slug string, ok bool) {
	locale, slug = r.PathValue("locale"), r.PathValue("slug")
	if err := content.ValidateLocale(locale); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return "", "", false
	}
	if err := content.ValidateSlug(slug); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return "", "", false
	}
	return locale, slug, true
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	return decodeJSONWithLimit(w, r, target, maxBodyBytes, false)
}

func decodeJSONWithLimit(w http.ResponseWriter, r *http.Request, target any, limit int64, strict bool) bool {
	r.Body = http.MaxBytesReader(w, r.Body, limit)
	decoder := json.NewDecoder(r.Body)
	if strict {
		decoder.DisallowUnknownFields()
	}
	if err := decoder.Decode(target); err != nil {
		writeError(w, http.StatusBadRequest, "request body must be valid JSON")
		return false
	}
	if decoder.More() {
		writeError(w, http.StatusBadRequest, "request body must contain a single JSON object")
		return false
	}
	return true
}

func writeStoreError(w http.ResponseWriter, err error, fallback string) {
	if errors.Is(err, content.ErrNotFound) {
		writeError(w, http.StatusNotFound, "entry not found")
		return
	}
	writeError(w, http.StatusInternalServerError, fallback)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(payload); err != nil {
		log.Printf("encode response: %v", err)
	}
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}

func clientKey(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		host = r.RemoteAddr
	}
	// Trust forwarding headers only from a local reverse proxy. Direct clients
	// cannot spoof their rate-limit identity with X-Forwarded-For.
	if ip := net.ParseIP(host); ip != nil && ip.IsLoopback() {
		forwarded := strings.TrimSpace(strings.Split(r.Header.Get("X-Forwarded-For"), ",")[0])
		if parsed := net.ParseIP(forwarded); parsed != nil {
			return parsed.String()
		}
	}
	return host
}

// rateLimiter is a small fixed-window per-client limiter. The service is
// localhost-only, so a map keyed by remote address is sufficient.
type rateLimiter struct {
	mu       sync.Mutex
	limit    int
	window   time.Duration
	visitors map[string]*visitor
}

type visitor struct {
	count int
	reset time.Time
}

func newRateLimiter(limit int, window time.Duration) *rateLimiter {
	if limit <= 0 {
		return nil
	}
	return &rateLimiter{limit: limit, window: window, visitors: map[string]*visitor{}}
}

func (l *rateLimiter) allow(key string) bool {
	now := time.Now()
	l.mu.Lock()
	defer l.mu.Unlock()

	entry, ok := l.visitors[key]
	if !ok || now.After(entry.reset) {
		l.visitors[key] = &visitor{count: 1, reset: now.Add(l.window)}
		l.prune(now)
		return true
	}
	if entry.count >= l.limit {
		return false
	}
	entry.count++
	return true
}

func (l *rateLimiter) prune(now time.Time) {
	if len(l.visitors) < 1000 {
		return
	}
	for key, entry := range l.visitors {
		if now.After(entry.reset) {
			delete(l.visitors, key)
		}
	}
}

// String documents the config for logs without leaking the token.
func (c Config) String() string {
	return fmt.Sprintf("admin=%t rateLimit=%d contactRateLimit=%d", c.AdminToken != "", c.RateLimit, c.ContactRateLimit)
}

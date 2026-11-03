package api

import (
	"mime"
	"net/http"
	"net/url"
	"strings"

	"portfolio/internal/content"
)

const maxContactBodyBytes = 16 << 10 // 16 KiB

// handleContactRoute accepts public contact submissions. Browser origins must
// be explicitly allowed; server-to-server requests without Origin still work.
func (s *Server) handleContactRoute(w http.ResponseWriter, r *http.Request) {
	if !s.allowContactOrigin(w, r) {
		return
	}

	if r.Method == http.MethodOptions {
		w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		w.Header().Set("Access-Control-Max-Age", "600")
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", "POST, OPTIONS")
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	if s.contactLimiter != nil && !s.contactLimiter.allow(clientKey(r)) {
		w.Header().Set("Retry-After", "3600")
		writeError(w, http.StatusTooManyRequests, "too many contact submissions, please try again later")
		return
	}

	mediaType, _, err := mime.ParseMediaType(r.Header.Get("Content-Type"))
	if err != nil || mediaType != "application/json" {
		writeError(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
		return
	}

	var input content.ContactInput
	if !decodeJSONWithLimit(w, r, &input, maxContactBodyBytes, true) {
		return
	}

	id, err := content.NewContactID()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "could not accept the message")
		return
	}

	// Honeypot submissions receive a normal response but are not persisted.
	// This avoids teaching simple bots which field triggered the filter.
	if strings.TrimSpace(input.Website) != "" {
		writeJSON(w, http.StatusCreated, map[string]string{"id": id, "status": "received"})
		return
	}

	if fields := input.Validate(); len(fields) > 0 {
		writeJSON(w, http.StatusBadRequest, map[string]any{
			"error":  "validation failed",
			"fields": fields,
		})
		return
	}

	submission := content.ContactSubmission{
		ID:      id,
		Name:    input.Name,
		Email:   input.Email,
		Subject: input.Subject,
		Message: input.Message,
		Locale:  input.Locale,
	}
	if err := s.store.SaveContactSubmission(r.Context(), submission); err != nil {
		writeError(w, http.StatusInternalServerError, "could not save the message")
		return
	}

	writeJSON(w, http.StatusCreated, map[string]string{"id": id, "status": "received"})
}

func (s *Server) allowContactOrigin(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	_, explicitlyAllowed := s.allowedOrigins[origin]
	if !explicitlyAllowed && !isSameOrigin(origin, r) {
		writeError(w, http.StatusForbidden, "origin is not allowed")
		return false
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Add("Vary", "Origin")
	return true
}

// isSameOrigin permits normal same-origin browser POSTs without configuration.
// Additional development origins still require the explicit allowlist.
func isSameOrigin(origin string, r *http.Request) bool {
	parsed, err := url.Parse(origin)
	if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") {
		return false
	}
	return parsed.Host == r.Host
}

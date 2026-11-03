package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"strings"
	"testing"
)

func contactPayload() map[string]any {
	return map[string]any{
		"name":    "Test Sender",
		"email":   "sender@example.com",
		"subject": "Project question",
		"message": "This is a valid message with enough characters.",
		"locale":  "en",
		"website": "",
	}
}

func TestContactSubmission(t *testing.T) {
	server := newTestServer(t, Config{})

	resp, body := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", contactPayload())
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("status = %d, body = %v", resp.StatusCode, body)
	}
	if !strings.HasPrefix(body["id"].(string), "msg_") || body["status"] != "received" {
		t.Fatalf("unexpected response: %v", body)
	}
	if _, leaked := body["message"]; leaked {
		t.Fatal("response must not echo the private message")
	}
}

func TestContactValidation(t *testing.T) {
	server := newTestServer(t, Config{})

	payload := contactPayload()
	payload["email"] = "invalid"
	payload["message"] = "short"
	resp, body := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", payload)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	fields, ok := body["fields"].(map[string]any)
	if !ok || fields["email"] == nil || fields["message"] == nil {
		t.Fatalf("expected field errors, got %v", body)
	}
}

func TestContactRejectsUnknownFieldsAndContentType(t *testing.T) {
	server := newTestServer(t, Config{})

	payload := contactPayload()
	payload["isAdmin"] = true
	resp, _ := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", payload)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("unknown field: status = %d", resp.StatusCode)
	}

	resp, err := http.Post(server.URL+"/api/v1/contact", "text/plain", strings.NewReader("hello"))
	if err != nil {
		t.Fatalf("Post: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnsupportedMediaType {
		t.Fatalf("content type: status = %d", resp.StatusCode)
	}
}

func TestContactBodyIsCapped(t *testing.T) {
	server := newTestServer(t, Config{})
	payload := contactPayload()
	payload["message"] = strings.Repeat("a", maxContactBodyBytes+1)

	resp, _ := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", payload)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d", resp.StatusCode)
	}
}

func TestContactHoneypotReturnsSuccess(t *testing.T) {
	server := newTestServer(t, Config{})
	payload := contactPayload()
	payload["website"] = "https://spam.example"

	resp, body := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", payload)
	if resp.StatusCode != http.StatusCreated || body["status"] != "received" {
		t.Fatalf("status = %d, body = %v", resp.StatusCode, body)
	}
}

func TestContactOriginAllowlist(t *testing.T) {
	server := newTestServer(t, Config{ContactAllowedOrigins: []string{"http://localhost:4321"}})

	payload, _ := json.Marshal(contactPayload())
	req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/contact", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", server.URL)
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("same-origin POST: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusCreated || resp.Header.Get("Access-Control-Allow-Origin") != server.URL {
		t.Fatalf("same origin: status = %d, headers = %v", resp.StatusCode, resp.Header)
	}

	req, _ = http.NewRequest(http.MethodOptions, server.URL+"/api/v1/contact", nil)
	req.Header.Set("Origin", "http://localhost:4321")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("OPTIONS: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNoContent || resp.Header.Get("Access-Control-Allow-Origin") != "http://localhost:4321" {
		t.Fatalf("preflight: status = %d, headers = %v", resp.StatusCode, resp.Header)
	}

	payload, _ = json.Marshal(contactPayload())
	req, _ = http.NewRequest(http.MethodPost, server.URL+"/api/v1/contact", bytes.NewReader(payload))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Origin", "https://evil.example")
	resp, err = http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("POST: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusForbidden || resp.Header.Get("Access-Control-Allow-Origin") != "" {
		t.Fatalf("disallowed origin: status = %d, headers = %v", resp.StatusCode, resp.Header)
	}
}

func TestContactRateLimit(t *testing.T) {
	server := newTestServer(t, Config{ContactRateLimit: 1})

	resp, _ := request(t, http.MethodPost, server.URL+"/api/v1/contact", "", contactPayload())
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("first submission: status = %d", resp.StatusCode)
	}
	resp, _ = request(t, http.MethodPost, server.URL+"/api/v1/contact", "", contactPayload())
	if resp.StatusCode != http.StatusTooManyRequests || resp.Header.Get("Retry-After") == "" {
		t.Fatalf("second submission: status = %d", resp.StatusCode)
	}
}

func TestContactRateLimitUsesTrustedProxyAddress(t *testing.T) {
	server := newTestServer(t, Config{ContactRateLimit: 1})

	for _, address := range []string{"203.0.113.1", "203.0.113.2"} {
		payload, _ := json.Marshal(contactPayload())
		req, _ := http.NewRequest(http.MethodPost, server.URL+"/api/v1/contact", bytes.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("X-Forwarded-For", address)
		resp, err := http.DefaultClient.Do(req)
		if err != nil {
			t.Fatalf("POST: %v", err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("address %s: status = %d", address, resp.StatusCode)
		}
	}
}

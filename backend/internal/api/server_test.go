package api

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"testing"

	"portfolio/internal/content"
)

const testToken = "test-token"

func newTestServer(t *testing.T, cfg Config) *httptest.Server {
	t.Helper()
	store, err := content.Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { store.Close() })

	server := httptest.NewServer(New(store, cfg).Handler())
	t.Cleanup(server.Close)
	return server
}

func request(t *testing.T, method, url, token string, payload any) (*http.Response, map[string]any) {
	t.Helper()
	var body bytes.Buffer
	if payload != nil {
		if err := json.NewEncoder(&body).Encode(payload); err != nil {
			t.Fatalf("encode payload: %v", err)
		}
	}
	req, err := http.NewRequest(method, url, &body)
	if err != nil {
		t.Fatalf("NewRequest: %v", err)
	}
	if payload != nil {
		req.Header.Set("Content-Type", "application/json")
	}
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatalf("Do: %v", err)
	}
	defer resp.Body.Close()

	var decoded map[string]any
	_ = json.NewDecoder(resp.Body).Decode(&decoded)
	return resp, decoded
}

func projectPayload(slug string) map[string]any {
	return map[string]any{
		"locale": "id",
		"slug":   slug,
		"body":   "Body",
		"data": map[string]any{
			"translationKey": "demo-" + slug,
			"title":          "Demo " + slug,
			"summary":        "Summary",
			"category":       "Test",
			"focus":          "Test",
			"status":         "Ongoing",
			"overview":       "Overview",
		},
	}
}

func TestPublicListRequiresValidLocale(t *testing.T) {
	server := newTestServer(t, Config{})

	resp, _ := request(t, http.MethodGet, server.URL+"/api/v1/projects", "", nil)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("missing locale: status = %d", resp.StatusCode)
	}

	resp, body := request(t, http.MethodGet, server.URL+"/api/v1/projects?locale=id", "", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if items, ok := body["items"].([]any); !ok || len(items) != 0 {
		t.Fatalf("expected an empty items array, got %v", body)
	}
}

func TestAdminRequiresToken(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})
	url := server.URL + "/api/v1/admin/projects"

	resp, _ := request(t, http.MethodPost, url, "", projectPayload("demo"))
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("no token: status = %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodPost, url, "wrong", projectPayload("demo"))
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("wrong token: status = %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodPost, url, testToken, projectPayload("demo"))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("valid token: status = %d", resp.StatusCode)
	}
}

func TestAdminDisabledWithoutToken(t *testing.T) {
	server := newTestServer(t, Config{})

	resp, _ := request(t, http.MethodPost, server.URL+"/api/v1/admin/projects", testToken, projectPayload("demo"))
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Fatalf("status = %d", resp.StatusCode)
	}
}

func TestContentLifecycle(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})
	admin := server.URL + "/api/v1/admin/projects"

	resp, _ := request(t, http.MethodPost, admin, testToken, projectPayload("demo"))
	if resp.StatusCode != http.StatusCreated {
		t.Fatalf("create: status = %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodPost, admin, testToken, projectPayload("demo"))
	if resp.StatusCode != http.StatusConflict {
		t.Fatalf("duplicate: status = %d", resp.StatusCode)
	}

	resp, body := request(t, http.MethodGet, server.URL+"/api/v1/projects?locale=id", "", nil)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("list: status = %d", resp.StatusCode)
	}
	if items := body["items"].([]any); len(items) != 1 {
		t.Fatalf("expected 1 item, got %v", body)
	}

	payload := projectPayload("demo")
	payload["body"] = "Updated body"
	resp, _ = request(t, http.MethodPut, admin+"/id/demo", testToken, payload)
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("update: status = %d", resp.StatusCode)
	}

	resp, body = request(t, http.MethodGet, admin+"/id/demo", testToken, nil)
	if resp.StatusCode != http.StatusOK || body["body"] != "Updated body" {
		t.Fatalf("get after update: status = %d body = %v", resp.StatusCode, body["body"])
	}

	resp, _ = request(t, http.MethodDelete, admin+"/id/demo", testToken, nil)
	if resp.StatusCode != http.StatusNoContent {
		t.Fatalf("delete: status = %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodGet, admin+"/id/demo", testToken, nil)
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("get after delete: status = %d", resp.StatusCode)
	}
}

func TestDraftArticlesStayPrivate(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})

	for _, slug := range []string{"published", "draft"} {
		resp, _ := request(t, http.MethodPost, server.URL+"/api/v1/admin/articles", testToken, map[string]any{
			"locale": "id",
			"slug":   slug,
			"data": map[string]any{
				"translationKey": "demo-" + slug,
				"title":          "Demo " + slug,
				"description":    "Description",
				"category":       "Test",
				"publishedAt":    "2026-11-01",
				"draft":          slug == "draft",
			},
		})
		if resp.StatusCode != http.StatusCreated {
			t.Fatalf("create %s: status = %d", slug, resp.StatusCode)
		}
	}

	_, body := request(t, http.MethodGet, server.URL+"/api/v1/articles?locale=id", "", nil)
	if items := body["items"].([]any); len(items) != 1 {
		t.Fatalf("public list should hide drafts, got %v", body)
	}

	_, body = request(t, http.MethodGet, server.URL+"/api/v1/admin/articles?locale=id", testToken, nil)
	if items := body["items"].([]any); len(items) != 2 {
		t.Fatalf("admin list should include drafts, got %v", body)
	}
}

func TestInvalidPayloadsAreRejected(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})

	resp, err := http.Post(server.URL+"/api/v1/admin/projects", "application/json", strings.NewReader("{"))
	if err != nil {
		t.Fatalf("Post: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusUnauthorized {
		t.Fatalf("expected auth first, got %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodPost, server.URL+"/api/v1/admin/projects", testToken, map[string]any{
		"locale": "id",
		"slug":   "demo",
		"data":   map[string]any{"title": "Demo"},
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("missing fields: status = %d", resp.StatusCode)
	}

	resp, _ = request(t, http.MethodPost, server.URL+"/api/v1/admin/projects", testToken, map[string]any{
		"locale": "id",
		"slug":   "Invalid Slug",
		"data":   projectPayload("demo")["data"],
	})
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("invalid slug: status = %d", resp.StatusCode)
	}
}

func TestRateLimit(t *testing.T) {
	server := newTestServer(t, Config{RateLimit: 2})

	for i := 1; i <= 3; i++ {
		resp, _ := request(t, http.MethodGet, server.URL+"/healthz", "", nil)
		want := http.StatusOK
		if i == 3 {
			want = http.StatusTooManyRequests
		}
		if resp.StatusCode != want {
			t.Fatalf("request %d: status = %d, want %d", i, resp.StatusCode, want)
		}
	}
}

func TestRequestBodyIsCapped(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})

	payload := projectPayload("demo")
	payload["body"] = strings.Repeat("a", maxBodyBytes+1)
	resp, body := request(t, http.MethodPost, server.URL+"/api/v1/admin/projects", testToken, payload)
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("status = %d, body = %v", resp.StatusCode, body)
	}
}

func ExampleConfig() {
	fmt.Println(Config{AdminToken: "", RateLimit: 120})
	// Output: admin=false rateLimit=120 contactRateLimit=0
}

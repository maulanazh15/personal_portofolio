package api

import (
	"io"
	"net/http"
	"strings"
	"testing"
)

func TestAdminUIAssets(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})

	resp, err := http.Get(server.URL + "/admin/")
	if err != nil {
		t.Fatalf("Get admin UI: %v", err)
	}
	body, err := io.ReadAll(resp.Body)
	resp.Body.Close()
	if err != nil {
		t.Fatalf("Read admin UI: %v", err)
	}
	if resp.StatusCode != http.StatusOK {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if contentType := resp.Header.Get("Content-Type"); !strings.HasPrefix(contentType, "text/html") {
		t.Fatalf("Content-Type = %q", contentType)
	}
	if !strings.Contains(string(body), "Portfolio content admin") {
		t.Fatal("admin HTML was not served")
	}
	if !strings.Contains(resp.Header.Get("Content-Security-Policy"), "default-src 'none'") {
		t.Fatalf("missing strict CSP: %q", resp.Header.Get("Content-Security-Policy"))
	}
	if resp.Header.Get("X-Frame-Options") != "DENY" {
		t.Fatal("admin UI must deny framing")
	}

	for _, asset := range []string{"admin.css", "admin.js"} {
		resp, err := http.Get(server.URL + "/admin/" + asset)
		if err != nil {
			t.Fatalf("Get %s: %v", asset, err)
		}
		resp.Body.Close()
		if resp.StatusCode != http.StatusOK {
			t.Fatalf("%s status = %d", asset, resp.StatusCode)
		}
	}

	resp, err = http.Get(server.URL + "/admin/unknown")
	if err != nil {
		t.Fatalf("Get unknown asset: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusNotFound {
		t.Fatalf("unknown asset status = %d", resp.StatusCode)
	}
}

func TestAdminUIRedirect(t *testing.T) {
	server := newTestServer(t, Config{AdminToken: testToken})
	client := &http.Client{CheckRedirect: func(_ *http.Request, _ []*http.Request) error {
		return http.ErrUseLastResponse
	}}
	resp, err := client.Get(server.URL + "/admin")
	if err != nil {
		t.Fatalf("Get admin redirect: %v", err)
	}
	resp.Body.Close()
	if resp.StatusCode != http.StatusTemporaryRedirect {
		t.Fatalf("status = %d", resp.StatusCode)
	}
	if location := resp.Header.Get("Location"); location != "/admin/" {
		t.Fatalf("Location = %q", location)
	}
}

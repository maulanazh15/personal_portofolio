package content

import (
	"encoding/json"
	"testing"
)

func TestParseMarkdown(t *testing.T) {
	source := []byte("---\ntitle: Demo\ntags:\n  - one\n  - two\n---\n\nBody text.\n")

	frontmatter, body, err := ParseMarkdown(source)
	if err != nil {
		t.Fatalf("ParseMarkdown: %v", err)
	}
	if string(frontmatter) != "title: Demo\ntags:\n  - one\n  - two" {
		t.Fatalf("frontmatter = %q", frontmatter)
	}
	if body != "Body text.\n" {
		t.Fatalf("body = %q", body)
	}
}

func TestParseMarkdownRequiresDelimiters(t *testing.T) {
	if _, _, err := ParseMarkdown([]byte("no frontmatter")); err == nil {
		t.Fatal("expected an error without frontmatter")
	}
	if _, _, err := ParseMarkdown([]byte("---\ntitle: Demo\n")); err == nil {
		t.Fatal("expected an error without a closing delimiter")
	}
}

func TestYAMLToJSON(t *testing.T) {
	data, err := YAMLToJSON([]byte("title: Demo\npublishedAt: 2026-11-01\ntags:\n  - one\n  - two\norder: 2\n"))
	if err != nil {
		t.Fatalf("YAMLToJSON: %v", err)
	}

	var decoded struct {
		Title       string   `json:"title"`
		PublishedAt string   `json:"publishedAt"`
		Tags        []string `json:"tags"`
		Order       int      `json:"order"`
	}
	if err := json.Unmarshal(data, &decoded); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if decoded.Title != "Demo" || decoded.PublishedAt != "2026-11-01" || decoded.Order != 2 {
		t.Fatalf("decoded = %+v", decoded)
	}
	if len(decoded.Tags) != 2 || decoded.Tags[0] != "one" {
		t.Fatalf("tags = %+v", decoded.Tags)
	}
}

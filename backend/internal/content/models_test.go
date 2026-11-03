package content

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestNormalizeProjectData(t *testing.T) {
	raw := json.RawMessage(`{
		"translationKey": "demo",
		"title": "Demo",
		"summary": "Summary",
		"category": "Test",
		"focus": "Test",
		"status": "Ongoing",
		"overview": "Overview"
	}`)

	normalized, err := NormalizeData(KindProject, raw)
	if err != nil {
		t.Fatalf("NormalizeData: %v", err)
	}

	var project Project
	if err := json.Unmarshal(normalized, &project); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if project.Stack == nil || project.Tags == nil || project.Areas == nil || project.Objectives == nil {
		t.Fatal("expected empty slices instead of null")
	}
	if project.Order != 0 || project.DocsPending {
		t.Fatalf("unexpected defaults: %+v", project)
	}
}

func TestNormalizeProjectRejectsMissingAndUnknownFields(t *testing.T) {
	_, err := NormalizeData(KindProject, json.RawMessage(`{"title": "Demo"}`))
	if err == nil {
		t.Fatal("expected an error for missing required fields")
	}

	_, err = NormalizeData(KindProject, json.RawMessage(`{
		"translationKey": "demo",
		"title": "Demo",
		"summary": "Summary",
		"category": "Test",
		"focus": "Test",
		"status": "Ongoing",
		"overview": "Overview",
		"unexpected": true
	}`))
	if err == nil || !strings.Contains(err.Error(), "unexpected") {
		t.Fatalf("expected unknown field error, got %v", err)
	}
}

func TestNormalizeProjectRejectsBadRepository(t *testing.T) {
	_, err := NormalizeData(KindProject, json.RawMessage(`{
		"translationKey": "demo",
		"title": "Demo",
		"summary": "Summary",
		"category": "Test",
		"focus": "Test",
		"status": "Ongoing",
		"overview": "Overview",
		"repo": "not-a-url"
	}`))
	if err == nil {
		t.Fatal("expected an invalid repo URL error")
	}
}

func TestNormalizeArticleDates(t *testing.T) {
	raw := json.RawMessage(`{
		"translationKey": "demo",
		"title": "Demo",
		"description": "Description",
		"category": "Test",
		"publishedAt": "2026-11-01T00:00:00Z",
		"updatedAt": ""
	}`)

	normalized, err := NormalizeData(KindArticle, raw)
	if err != nil {
		t.Fatalf("NormalizeData: %v", err)
	}

	var article Article
	if err := json.Unmarshal(normalized, &article); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	if article.PublishedAt != "2026-11-01" {
		t.Fatalf("publishedAt = %q", article.PublishedAt)
	}
	if article.UpdatedAt != "" {
		t.Fatalf("updatedAt = %q", article.UpdatedAt)
	}

	_, err = NormalizeData(KindArticle, json.RawMessage(`{
		"translationKey": "demo",
		"title": "Demo",
		"description": "Description",
		"category": "Test",
		"publishedAt": "yesterday"
	}`))
	if err == nil {
		t.Fatal("expected an invalid date error")
	}
}

func TestValidateEntryRoutingFields(t *testing.T) {
	entry := Entry{Kind: KindProject, Locale: "fr", Slug: "Bad Slug", Data: json.RawMessage(`{}`)}
	if err := ValidateEntry(&entry); err == nil {
		t.Fatal("expected a locale error")
	}

	entry.Locale = "id"
	if err := ValidateEntry(&entry); err == nil {
		t.Fatal("expected a slug error")
	}
}

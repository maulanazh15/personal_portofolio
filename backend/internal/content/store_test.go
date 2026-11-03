package content

import (
	"context"
	"encoding/json"
	"errors"
	"path/filepath"
	"testing"
)

func testStore(t *testing.T) *Store {
	t.Helper()
	store, err := Open(context.Background(), filepath.Join(t.TempDir(), "test.db"))
	if err != nil {
		t.Fatalf("Open: %v", err)
	}
	t.Cleanup(func() { store.Close() })
	return store
}

func projectEntry(slug string, order int) Entry {
	data, _ := json.Marshal(Project{
		TranslationKey: "demo-" + slug,
		Title:          "Demo " + slug,
		Summary:        "Summary",
		Category:       "Test",
		Focus:          "Test",
		Status:         "Ongoing",
		Order:          order,
		Overview:       "Overview",
		Stack:          []string{},
		Tags:           []string{},
		Areas:          []string{},
		Objectives:     []string{},
	})
	return Entry{Kind: KindProject, Locale: "id", Slug: slug, Data: data, Body: "Body"}
}

func TestStoreCRUD(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)
	entry := projectEntry("demo", 1)

	if err := store.Create(ctx, entry); err != nil {
		t.Fatalf("Create: %v", err)
	}
	if err := store.Create(ctx, entry); !errors.Is(err, ErrConflict) {
		t.Fatalf("expected ErrConflict, got %v", err)
	}

	got, err := store.Get(ctx, KindProject, "id", "demo")
	if err != nil {
		t.Fatalf("Get: %v", err)
	}
	if got.Body != "Body" {
		t.Fatalf("body = %q", got.Body)
	}

	entry.Body = "Updated"
	if err := store.Update(ctx, entry); err != nil {
		t.Fatalf("Update: %v", err)
	}
	got, _ = store.Get(ctx, KindProject, "id", "demo")
	if got.Body != "Updated" {
		t.Fatalf("body after update = %q", got.Body)
	}

	if err := store.Delete(ctx, KindProject, "id", "demo"); err != nil {
		t.Fatalf("Delete: %v", err)
	}
	if _, err := store.Get(ctx, KindProject, "id", "demo"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound, got %v", err)
	}
	if err := store.Update(ctx, entry); !errors.Is(err, ErrNotFound) {
		t.Fatalf("expected ErrNotFound on update, got %v", err)
	}
}

func TestStoreListOrdering(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)

	for _, entry := range []Entry{projectEntry("second", 2), projectEntry("first", 1)} {
		if err := store.Create(ctx, entry); err != nil {
			t.Fatalf("Create: %v", err)
		}
	}
	english := projectEntry("english", 0)
	english.Locale = "en"
	if err := store.Create(ctx, english); err != nil {
		t.Fatalf("Create: %v", err)
	}

	entries, err := store.List(ctx, KindProject, "id", false)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Slug != "first" || entries[1].Slug != "second" {
		t.Fatalf("unexpected order: %s, %s", entries[0].Slug, entries[1].Slug)
	}
}

func TestStoreDraftFiltering(t *testing.T) {
	ctx := context.Background()
	store := testStore(t)

	for slug, draft := range map[string]bool{"published": false, "draft": true} {
		data, _ := json.Marshal(Article{
			TranslationKey: "demo-" + slug,
			Title:          "Demo " + slug,
			Description:    "Description",
			Category:       "Test",
			PublishedAt:    "2026-11-01",
			Draft:          draft,
			Tags:           []string{},
		})
		entry := Entry{Kind: KindArticle, Locale: "id", Slug: slug, Data: data}
		if err := store.Create(ctx, entry); err != nil {
			t.Fatalf("Create: %v", err)
		}
	}

	entries, err := store.List(ctx, KindArticle, "id", false)
	if err != nil {
		t.Fatalf("List: %v", err)
	}
	if len(entries) != 1 || entries[0].Slug != "published" {
		t.Fatalf("expected only the published article, got %+v", entries)
	}

	entries, err = store.List(ctx, KindArticle, "id", true)
	if err != nil {
		t.Fatalf("List with drafts: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries with drafts, got %d", len(entries))
	}
}

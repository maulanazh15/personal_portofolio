// Command import loads the existing Markdown content into SQLite. It is
// idempotent: re-running updates entries with the same collection/locale/slug.
package main

import (
	"context"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"strings"

	"portfolio/internal/content"
)

func main() {
	dbPath := flag.String("db", "data/portfolio.db", "SQLite database path")
	dir := flag.String("dir", "../content", "directory containing projects/ and articles/")
	flag.Parse()

	store, err := content.Open(context.Background(), *dbPath)
	if err != nil {
		log.Fatalf("open content store: %v", err)
	}
	defer store.Close()

	count, err := importDirectory(context.Background(), store, *dir)
	if err != nil {
		log.Fatalf("import: %v", err)
	}
	log.Printf("imported %d entries from %s", count, *dir)
}

func importDirectory(ctx context.Context, store *content.Store, root string) (int, error) {
	count := 0
	err := filepath.WalkDir(root, func(path string, item fs.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if item.IsDir() || !strings.HasSuffix(item.Name(), ".md") {
			return nil
		}

		entry, err := readEntry(root, path)
		if err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		if err := content.ValidateEntry(&entry); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		if err := store.Upsert(ctx, entry); err != nil {
			return fmt.Errorf("%s: %w", path, err)
		}
		count++
		return nil
	})
	return count, err
}

func readEntry(root, path string) (content.Entry, error) {
	relative, err := filepath.Rel(root, path)
	if err != nil {
		return content.Entry{}, err
	}
	parts := strings.Split(filepath.ToSlash(relative), "/")
	if len(parts) != 3 {
		return content.Entry{}, fmt.Errorf("expected <collection>/<locale>/<slug>.md, got %s", relative)
	}

	kind, err := content.ParseKind(parts[0])
	if err != nil {
		return content.Entry{}, err
	}

	source, err := os.ReadFile(path)
	if err != nil {
		return content.Entry{}, err
	}
	frontmatter, body, err := content.ParseMarkdown(source)
	if err != nil {
		return content.Entry{}, err
	}
	data, err := content.YAMLToJSON(frontmatter)
	if err != nil {
		return content.Entry{}, err
	}

	return content.Entry{
		Kind:   kind,
		Locale: parts[1],
		Slug:   strings.TrimSuffix(parts[2], ".md"),
		Data:   data,
		Body:   body,
	}, nil
}

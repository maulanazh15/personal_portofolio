package content

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// Store persists entries in SQLite. A single table keeps the two collections
// uniform; the JSON document holds the fields the frontend consumes.
type Store struct {
	db *sql.DB
}

// Open opens (and creates if needed) the database at path and migrates it.
func Open(ctx context.Context, path string) (*Store, error) {
	if dir := filepath.Dir(path); dir != "." {
		if err := os.MkdirAll(dir, 0o750); err != nil {
			return nil, fmt.Errorf("create database directory: %w", err)
		}
	}

	db, err := sql.Open("sqlite", path+"?_pragma=busy_timeout(5000)&_pragma=journal_mode(WAL)&_pragma=foreign_keys(1)")
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}
	// SQLite is a single-writer database; one connection avoids SQLITE_BUSY
	// surprises under the small admin workload this service has.
	db.SetMaxOpenConns(1)

	store := &Store{db: db}
	if err := store.migrate(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return store, nil
}

// Close releases the underlying database handle.
func (s *Store) Close() error {
	return s.db.Close()
}

func (s *Store) migrate(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS entries (
			id             INTEGER PRIMARY KEY,
			kind           TEXT NOT NULL CHECK (kind IN ('project', 'article')),
			locale         TEXT NOT NULL CHECK (locale IN ('id', 'en')),
			slug           TEXT NOT NULL,
			translation_key TEXT NOT NULL DEFAULT '',
			title          TEXT NOT NULL,
			sort_order     INTEGER NOT NULL DEFAULT 0,
			published_at   TEXT NOT NULL DEFAULT '',
			draft          INTEGER NOT NULL DEFAULT 0,
			data           TEXT NOT NULL,
			body           TEXT NOT NULL DEFAULT '',
			created_at     TEXT NOT NULL,
			updated_at     TEXT NOT NULL,
			UNIQUE (kind, locale, slug)
		);
		CREATE INDEX IF NOT EXISTS entries_listing
			ON entries (kind, locale, draft, sort_order, published_at);
	`)
	if err != nil {
		return fmt.Errorf("migrate database: %w", err)
	}
	if err := s.migrateContact(ctx); err != nil {
		return err
	}
	return nil
}

func (s *Store) write(ctx context.Context, entry Entry, query string) error {
	title, order, publishedAt, draft, err := entryMeta(entry)
	if err != nil {
		return fmt.Errorf("read entry metadata: %w", err)
	}
	now := time.Now().UTC().Format(time.RFC3339)
	_, err = s.db.ExecContext(ctx, query,
		entry.Kind, entry.Locale, entry.Slug, title, order, publishedAt, draft,
		string(entry.Data), entry.Body, now, now,
	)
	return err
}

// Create inserts a new entry and fails with ErrConflict if it already exists.
func (s *Store) Create(ctx context.Context, entry Entry) error {
	err := s.write(ctx, entry, `
		INSERT INTO entries
			(kind, locale, slug, title, sort_order, published_at, draft, data, body, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrConflict
		}
		return fmt.Errorf("create entry: %w", err)
	}
	return nil
}

// Update replaces an existing entry, preserving its creation timestamp.
func (s *Store) Update(ctx context.Context, entry Entry) error {
	title, order, publishedAt, draft, err := entryMeta(entry)
	if err != nil {
		return fmt.Errorf("read entry metadata: %w", err)
	}
	result, err := s.db.ExecContext(ctx, `
		UPDATE entries
		SET title = ?, sort_order = ?, published_at = ?, draft = ?, data = ?, body = ?, updated_at = ?
		WHERE kind = ? AND locale = ? AND slug = ?
	`,
		title, order, publishedAt, draft, string(entry.Data), entry.Body,
		time.Now().UTC().Format(time.RFC3339), entry.Kind, entry.Locale, entry.Slug,
	)
	if err != nil {
		return fmt.Errorf("update entry: %w", err)
	}
	return requireAffected(result)
}

// Upsert inserts or replaces an entry. Used by the Markdown importer so a
// re-run is idempotent.
func (s *Store) Upsert(ctx context.Context, entry Entry) error {
	err := s.write(ctx, entry, `
		INSERT INTO entries
			(kind, locale, slug, title, sort_order, published_at, draft, data, body, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (kind, locale, slug) DO UPDATE SET
			title = excluded.title,
			sort_order = excluded.sort_order,
			published_at = excluded.published_at,
			draft = excluded.draft,
			data = excluded.data,
			body = excluded.body,
			updated_at = excluded.updated_at
	`)
	if err != nil {
		return fmt.Errorf("upsert entry: %w", err)
	}
	return nil
}

// Delete removes an entry.
func (s *Store) Delete(ctx context.Context, kind Kind, locale, slug string) error {
	result, err := s.db.ExecContext(ctx,
		`DELETE FROM entries WHERE kind = ? AND locale = ? AND slug = ?`, kind, locale, slug)
	if err != nil {
		return fmt.Errorf("delete entry: %w", err)
	}
	return requireAffected(result)
}

// Get fetches one entry by collection, locale, and slug.
func (s *Store) Get(ctx context.Context, kind Kind, locale, slug string) (Entry, error) {
	row := s.db.QueryRowContext(ctx, `
		SELECT kind, locale, slug, data, body FROM entries
		WHERE kind = ? AND locale = ? AND slug = ?
	`, kind, locale, slug)
	return scanEntry(row)
}

// List returns entries for one collection and locale, sorted for display.
// Draft articles are excluded unless includeDrafts is set.
func (s *Store) List(ctx context.Context, kind Kind, locale string, includeDrafts bool) ([]Entry, error) {
	order := "sort_order ASC, title ASC"
	if kind == KindArticle {
		order = "published_at DESC, title ASC"
	}
	query := `
		SELECT kind, locale, slug, data, body FROM entries
		WHERE kind = ? AND locale = ?
	`
	if !includeDrafts {
		query += " AND draft = 0"
	}
	query += " ORDER BY " + order

	rows, err := s.db.QueryContext(ctx, query, kind, locale)
	if err != nil {
		return nil, fmt.Errorf("list entries: %w", err)
	}
	defer rows.Close()

	entries := []Entry{}
	for rows.Next() {
		entry, err := scanEntry(rows)
		if err != nil {
			return nil, err
		}
		entries = append(entries, entry)
	}
	return entries, rows.Err()
}

type scanner interface {
	Scan(dest ...any) error
}

func scanEntry(row scanner) (Entry, error) {
	var entry Entry
	var data string
	if err := row.Scan(&entry.Kind, &entry.Locale, &entry.Slug, &data, &entry.Body); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return Entry{}, ErrNotFound
		}
		return Entry{}, fmt.Errorf("scan entry: %w", err)
	}
	entry.Data = json.RawMessage(data)
	return entry, nil
}

func requireAffected(result sql.Result) error {
	affected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if affected == 0 {
		return ErrNotFound
	}
	return nil
}

func isUniqueViolation(err error) bool {
	return err != nil && strings.Contains(err.Error(), "UNIQUE constraint failed")
}

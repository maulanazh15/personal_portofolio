package content

import (
	"context"
	"fmt"
	"time"
)

func (s *Store) migrateContact(ctx context.Context) error {
	_, err := s.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS contact_submissions (
			id         TEXT PRIMARY KEY,
			name       TEXT NOT NULL,
			email      TEXT NOT NULL,
			subject    TEXT NOT NULL DEFAULT '',
			message    TEXT NOT NULL,
			locale     TEXT NOT NULL CHECK (locale IN ('id', 'en')),
			status     TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'archived')),
			created_at TEXT NOT NULL
		);
		CREATE INDEX IF NOT EXISTS contact_submissions_created
			ON contact_submissions (created_at DESC);
	`)
	if err != nil {
		return fmt.Errorf("migrate contact submissions: %w", err)
	}
	return nil
}

// SaveContactSubmission stores a private message. Submissions are deliberately
// write-only through the public API; there is no list or lookup handler.
func (s *Store) SaveContactSubmission(ctx context.Context, submission ContactSubmission) error {
	submission.CreatedAt = time.Now().UTC().Format(time.RFC3339)
	_, err := s.db.ExecContext(ctx, `
		INSERT INTO contact_submissions (id, name, email, subject, message, locale, created_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`, submission.ID, submission.Name, submission.Email, submission.Subject,
		submission.Message, submission.Locale, submission.CreatedAt)
	if err != nil {
		return fmt.Errorf("save contact submission: %w", err)
	}
	return nil
}

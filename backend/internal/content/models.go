// Package content holds the content model, validation, and SQLite store for
// the portfolio. Projects and articles are the source of truth for the Astro
// build; the frontend never writes to this database.
package content

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strings"
	"time"
)

// Kind identifies a content collection.
type Kind string

const (
	KindProject Kind = "project"
	KindArticle Kind = "article"
)

// ParseKind validates a collection name used in URLs ("projects"/"articles").
func ParseKind(value string) (Kind, error) {
	switch value {
	case "projects":
		return KindProject, nil
	case "articles":
		return KindArticle, nil
	default:
		return "", fmt.Errorf("unknown collection %q", value)
	}
}

// Path returns the plural collection segment used in URLs.
func (k Kind) Path() string {
	if k == KindArticle {
		return "articles"
	}
	return "projects"
}

var (
	// ErrNotFound is returned when an entry does not exist.
	ErrNotFound = errors.New("entry not found")
	// ErrConflict is returned when an entry already exists.
	ErrConflict = errors.New("entry already exists")

	slugPattern = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

// Entry is one localized content document. Data holds the frontmatter fields
// exactly as the frontend expects them; Body is the Markdown body.
type Entry struct {
	Kind   Kind            `json:"kind"`
	Locale string          `json:"locale"`
	Slug   string          `json:"slug"`
	Data   json.RawMessage `json:"data"`
	Body   string          `json:"body"`
}

// ValidateSlug enforces the URL-safe slug format shared with the frontend.
func ValidateSlug(slug string) error {
	if !slugPattern.MatchString(slug) {
		return errors.New("slug must use lowercase letters, numbers, and hyphens")
	}
	return nil
}

// ValidateLocale restricts content to the two site languages.
func ValidateLocale(locale string) error {
	if locale != "id" && locale != "en" {
		return fmt.Errorf("locale must be %q or %q", "id", "en")
	}
	return nil
}

// Project mirrors the Astro `projects` collection schema.
type Project struct {
	TranslationKey string   `json:"translationKey"`
	Title          string   `json:"title"`
	Subtitle       string   `json:"subtitle,omitempty"`
	Summary        string   `json:"summary"`
	Category       string   `json:"category"`
	Focus          string   `json:"focus"`
	Status         string   `json:"status"`
	Order          int      `json:"order"`
	Stack          []string `json:"stack"`
	Tags           []string `json:"tags"`
	Repo           string   `json:"repo,omitempty"`
	DocsPending    bool     `json:"docsPending"`
	Overview       string   `json:"overview"`
	Background     string   `json:"background,omitempty"`
	Areas          []string `json:"areas"`
	Objectives     []string `json:"objectives"`
	Role           string   `json:"role,omitempty"`
	Process        string   `json:"process,omitempty"`
	Challenges     string   `json:"challenges,omitempty"`
	Results        string   `json:"results,omitempty"`
	Outcomes       string   `json:"outcomes,omitempty"`
}

// Article mirrors the Astro `articles` collection schema.
type Article struct {
	TranslationKey string   `json:"translationKey"`
	Title          string   `json:"title"`
	Description    string   `json:"description"`
	Category       string   `json:"category"`
	Tags           []string `json:"tags"`
	PublishedAt    string   `json:"publishedAt"`
	UpdatedAt      string   `json:"updatedAt,omitempty"`
	Draft          bool     `json:"draft"`
	RelatedProject string   `json:"relatedProject,omitempty"`
}

func required(fields map[string]string) error {
	for name, value := range fields {
		if strings.TrimSpace(value) == "" {
			return fmt.Errorf("%s is required", name)
		}
	}
	return nil
}

func normalizeDate(value string) (string, error) {
	if value == "" {
		return "", nil
	}
	for _, layout := range []string{"2006-01-02", time.RFC3339, "2006-01-02 15:04:05"} {
		if parsed, err := time.Parse(layout, value); err == nil {
			return parsed.Format("2006-01-02"), nil
		}
	}
	return "", fmt.Errorf("invalid date %q, expected YYYY-MM-DD", value)
}

// NormalizeData validates frontmatter for a collection and returns canonical
// JSON. Unknown fields are rejected so API and import typos fail loudly.
func NormalizeData(kind Kind, raw json.RawMessage) (json.RawMessage, error) {
	decode := func(target any) error {
		decoder := json.NewDecoder(bytes.NewReader(raw))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(target); err != nil {
			return fmt.Errorf("invalid %s data: %w", kind, err)
		}
		return nil
	}

	switch kind {
	case KindProject:
		var project Project
		if err := decode(&project); err != nil {
			return nil, err
		}
		if err := required(map[string]string{
			"translationKey": project.TranslationKey,
			"title":          project.Title,
			"summary":        project.Summary,
			"category":       project.Category,
			"focus":          project.Focus,
			"status":         project.Status,
			"overview":       project.Overview,
		}); err != nil {
			return nil, err
		}
		if project.Repo != "" {
			parsed, err := url.Parse(project.Repo)
			if err != nil || (parsed.Scheme != "http" && parsed.Scheme != "https") || parsed.Host == "" {
				return nil, errors.New("repo must be a full http(s) URL")
			}
		}
		if project.Stack == nil {
			project.Stack = []string{}
		}
		if project.Tags == nil {
			project.Tags = []string{}
		}
		if project.Areas == nil {
			project.Areas = []string{}
		}
		if project.Objectives == nil {
			project.Objectives = []string{}
		}
		return json.Marshal(project)

	case KindArticle:
		var article Article
		if err := decode(&article); err != nil {
			return nil, err
		}
		if err := required(map[string]string{
			"translationKey": article.TranslationKey,
			"title":          article.Title,
			"description":    article.Description,
			"category":       article.Category,
			"publishedAt":    article.PublishedAt,
		}); err != nil {
			return nil, err
		}
		published, err := normalizeDate(article.PublishedAt)
		if err != nil {
			return nil, fmt.Errorf("publishedAt: %w", err)
		}
		article.PublishedAt = published
		updated, err := normalizeDate(article.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("updatedAt: %w", err)
		}
		article.UpdatedAt = updated
		if article.Tags == nil {
			article.Tags = []string{}
		}
		return json.Marshal(article)

	default:
		return nil, fmt.Errorf("unknown collection %q", kind)
	}
}

// ValidateEntry checks the routing fields and normalizes the frontmatter.
func ValidateEntry(entry *Entry) error {
	if entry.Kind != KindProject && entry.Kind != KindArticle {
		return fmt.Errorf("unknown collection %q", entry.Kind)
	}
	if err := ValidateLocale(entry.Locale); err != nil {
		return err
	}
	if err := ValidateSlug(entry.Slug); err != nil {
		return err
	}
	normalized, err := NormalizeData(entry.Kind, entry.Data)
	if err != nil {
		return err
	}
	entry.Data = normalized
	return nil
}

// entryMeta extracts the columns used for filtering and sorting.
func entryMeta(entry Entry) (title string, order int, publishedAt string, draft bool, err error) {
	var meta struct {
		Title       string `json:"title"`
		Order       int    `json:"order"`
		PublishedAt string `json:"publishedAt"`
		Draft       bool   `json:"draft"`
	}
	if err := json.Unmarshal(entry.Data, &meta); err != nil {
		return "", 0, "", false, err
	}
	return meta.Title, meta.Order, meta.PublishedAt, meta.Draft, nil
}

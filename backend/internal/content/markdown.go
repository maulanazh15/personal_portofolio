package content

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"gopkg.in/yaml.v3"
)

// ParseMarkdown splits a Markdown file into YAML frontmatter and body. The
// frontmatter delimiters must be on their own lines, as produced by the CMS
// and by the existing content files.
func ParseMarkdown(source []byte) (frontmatter []byte, body string, err error) {
	text := strings.ReplaceAll(string(source), "\r\n", "\n")
	if !strings.HasPrefix(text, "---\n") {
		return nil, "", errors.New("missing opening frontmatter delimiter")
	}
	rest := text[len("---\n"):]
	end := strings.Index(rest, "\n---")
	if end < 0 {
		return nil, "", errors.New("missing closing frontmatter delimiter")
	}
	frontmatter = []byte(rest[:end])

	after := rest[end+len("\n---"):]
	if strings.HasPrefix(after, "\n") {
		after = after[1:]
	} else if after != "" {
		return nil, "", errors.New("closing frontmatter delimiter must be on its own line")
	}
	return frontmatter, strings.TrimPrefix(after, "\n"), nil
}

// YAMLToJSON converts frontmatter YAML into JSON. YAML timestamps are turned
// into date strings so article dates survive the round trip.
func YAMLToJSON(source []byte) (json.RawMessage, error) {
	var document map[string]any
	if err := yaml.Unmarshal(source, &document); err != nil {
		return nil, fmt.Errorf("parse frontmatter: %w", err)
	}
	if document == nil {
		document = map[string]any{}
	}
	normalizeYAML(document)
	encoded, err := json.Marshal(document)
	if err != nil {
		return nil, fmt.Errorf("encode frontmatter: %w", err)
	}
	return encoded, nil
}

func normalizeYAML(value any) {
	switch typed := value.(type) {
	case map[string]any:
		for key, item := range typed {
			if timestamp, ok := item.(time.Time); ok {
				typed[key] = timestamp.Format("2006-01-02")
				continue
			}
			normalizeYAML(item)
		}
	case []any:
		for _, item := range typed {
			normalizeYAML(item)
		}
	}
}

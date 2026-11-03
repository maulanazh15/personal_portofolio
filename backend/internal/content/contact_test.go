package content

import (
	"context"
	"strings"
	"testing"
)

func validContactInput() ContactInput {
	return ContactInput{
		Name:    "  Maulana Zhahran  ",
		Email:   "  MAULANAZH15@GMAIL.COM ",
		Subject: "  Project discussion ",
		Message: "  This is a sufficiently long project message.  ",
		Locale:  "id",
	}
}

func TestContactInputValidate(t *testing.T) {
	input := validContactInput()
	if fields := input.Validate(); len(fields) != 0 {
		t.Fatalf("expected valid input, got %v", fields)
	}
	if input.Name != "Maulana Zhahran" || input.Email != "maulanazh15@gmail.com" {
		t.Fatalf("normalization failed: %+v", input)
	}
	if input.Subject != "Project discussion" || !strings.HasPrefix(input.Message, "This is") {
		t.Fatalf("trimming failed: %+v", input)
	}
}

func TestContactInputValidationErrors(t *testing.T) {
	tests := []struct {
		name   string
		mutate func(*ContactInput)
		field  string
	}{
		{"short name", func(input *ContactInput) { input.Name = "x" }, "name"},
		{"long name", func(input *ContactInput) { input.Name = strings.Repeat("x", 101) }, "name"},
		{"empty email", func(input *ContactInput) { input.Email = "" }, "email"},
		{"invalid email", func(input *ContactInput) { input.Email = "not-an-email" }, "email"},
		{"display name email", func(input *ContactInput) { input.Email = "Person <person@example.com>" }, "email"},
		{"header injection", func(input *ContactInput) { input.Email = "person@example.com\nBcc: other@example.com" }, "email"},
		{"long subject", func(input *ContactInput) { input.Subject = strings.Repeat("x", 151) }, "subject"},
		{"short message", func(input *ContactInput) { input.Message = "too short" }, "message"},
		{"long message", func(input *ContactInput) { input.Message = strings.Repeat("x", 5001) }, "message"},
		{"bad locale", func(input *ContactInput) { input.Locale = "fr" }, "locale"},
		{"null byte", func(input *ContactInput) { input.Name = "Bad\x00Name" }, "name"},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			input := validContactInput()
			test.mutate(&input)
			if fields := input.Validate(); fields[test.field] == "" {
				t.Fatalf("expected an error for %s, got %v", test.field, fields)
			}
		})
	}
}

func TestContactID(t *testing.T) {
	first, err := NewContactID()
	if err != nil {
		t.Fatalf("NewContactID: %v", err)
	}
	second, err := NewContactID()
	if err != nil {
		t.Fatalf("NewContactID: %v", err)
	}
	if !strings.HasPrefix(first, "msg_") || len(first) != 36 {
		t.Fatalf("unexpected id %q", first)
	}
	if first == second {
		t.Fatal("contact IDs must be unique")
	}
}

func TestSaveContactSubmission(t *testing.T) {
	store := testStore(t)
	input := validContactInput()
	id, err := NewContactID()
	if err != nil {
		t.Fatalf("NewContactID: %v", err)
	}

	err = store.SaveContactSubmission(context.Background(), ContactSubmission{
		ID: id, Name: input.Name, Email: input.Email, Subject: input.Subject,
		Message: input.Message, Locale: input.Locale,
	})
	if err != nil {
		t.Fatalf("SaveContactSubmission: %v", err)
	}

	var count int
	if err := store.db.QueryRow(`SELECT COUNT(*) FROM contact_submissions WHERE id = ?`, id).Scan(&count); err != nil {
		t.Fatalf("query submission: %v", err)
	}
	if count != 1 {
		t.Fatalf("expected one stored submission, got %d", count)
	}
}

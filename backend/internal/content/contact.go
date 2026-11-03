package content

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"net/mail"
	"strings"
	"unicode/utf8"
)

// ContactSubmission is a private message sent through the public contact form.
// There is intentionally no public API for reading submissions.
type ContactSubmission struct {
	ID        string `json:"id"`
	Name      string `json:"name"`
	Email     string `json:"email"`
	Subject   string `json:"subject,omitempty"`
	Message   string `json:"message"`
	Locale    string `json:"locale"`
	CreatedAt string `json:"createdAt"`
}

// ContactInput is the payload accepted by the contact endpoint. Website is a
// honeypot field: legitimate visitors always leave it empty.
type ContactInput struct {
	Name    string `json:"name"`
	Email   string `json:"email"`
	Subject string `json:"subject"`
	Message string `json:"message"`
	Locale  string `json:"locale"`
	Website string `json:"website"`
}

// Validate normalizes a contact payload and returns field-specific errors.
// Values are treated as plain data, never as HTML or email headers.
func (input *ContactInput) Validate() map[string]string {
	input.Name = strings.TrimSpace(input.Name)
	input.Email = strings.ToLower(strings.TrimSpace(input.Email))
	input.Subject = strings.TrimSpace(input.Subject)
	input.Message = strings.TrimSpace(input.Message)

	errors := map[string]string{}
	if utf8.RuneCountInString(input.Name) < 2 || utf8.RuneCountInString(input.Name) > 100 {
		errors["name"] = "name must be between 2 and 100 characters"
	}
	if len(input.Email) > 254 || !validEmail(input.Email) {
		errors["email"] = "email must be a valid address"
	}
	if utf8.RuneCountInString(input.Subject) > 150 {
		errors["subject"] = "subject must be at most 150 characters"
	}
	if utf8.RuneCountInString(input.Message) < 20 || utf8.RuneCountInString(input.Message) > 5000 {
		errors["message"] = "message must be between 20 and 5000 characters"
	}
	if err := ValidateLocale(input.Locale); err != nil {
		errors["locale"] = "locale must be id or en"
	}
	for field, value := range map[string]string{
		"name": input.Name, "email": input.Email, "subject": input.Subject, "message": input.Message,
	} {
		if strings.ContainsRune(value, '\x00') {
			errors[field] = field + " contains an invalid control character"
		}
	}
	return errors
}

func validEmail(value string) bool {
	if value == "" || strings.ContainsAny(value, "\r\n") {
		return false
	}
	address, err := mail.ParseAddress(value)
	return err == nil && address.Address == value && address.Name == "" && strings.Contains(value, "@")
}

// NewContactID returns a random, non-sequential public reference.
func NewContactID() (string, error) {
	var bytes [16]byte
	if _, err := rand.Read(bytes[:]); err != nil {
		return "", fmt.Errorf("generate contact reference: %w", err)
	}
	return "msg_" + hex.EncodeToString(bytes[:]), nil
}

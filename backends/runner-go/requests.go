package main

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

const (
	maxRequestBytes = 1 << 20
	defaultPage     = 1
	defaultLimit    = 10
	maxLimit        = 100
	minLimit        = 1
)

var smallNumber = regexp.MustCompile(`^\d{1,9}$`)

type tagRequest struct {
	Name  string `json:"name"`
	Value string `json:"value"`
}

type sendEmailRequest struct {
	From    string          `json:"from"`
	To      json.RawMessage `json:"to"`
	Subject string          `json:"subject"`
	HTML    string          `json:"html"`
	Text    string          `json:"text"`
	ReplyTo string          `json:"replyTo"`
	Tags    []tagRequest    `json:"tags"`
}

type createDomainRequest struct {
	Name string `json:"name"`
}

type createTemplateRequest struct {
	Name    string `json:"name"`
	Subject string `json:"subject"`
	HTML    string `json:"html"`
	Format  string `json:"format"`
}

type createAudienceRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type createContactRequest struct {
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
}

type createSuppressionRequest struct {
	Email  string `json:"email"`
	Reason string `json:"reason"`
}

type createWebhookRequest struct {
	URL    string   `json:"url"`
	Events []string `json:"events"`
}

func decode[T any](r *http.Request) T {
	var out T
	_ = json.NewDecoder(io.LimitReader(r.Body, maxRequestBytes)).Decode(&out)
	return out
}

func present(values ...string) bool {
	for _, value := range values {
		if strings.TrimSpace(value) == "" {
			return false
		}
	}
	return true
}

func recipients(raw json.RawMessage) []string {
	var list []string
	if json.Unmarshal(raw, &list) == nil {
		return list
	}
	var single string
	if json.Unmarshal(raw, &single) == nil && single != "" {
		return []string{single}
	}
	return nil
}

func number(r *http.Request, name string, fallback int) int {
	raw := r.URL.Query().Get(name)
	if !smallNumber.MatchString(raw) {
		return fallback
	}
	value, err := strconv.Atoi(raw)
	if err != nil {
		return fallback
	}
	return value
}

func page(r *http.Request) int {
	return max(defaultPage, number(r, "page", defaultPage))
}

func limit(r *http.Request) int {
	return min(maxLimit, max(minLimit, number(r, "limit", defaultLimit)))
}

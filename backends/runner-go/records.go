package main

import (
	"math"
	"strings"
	"time"

	coffeemail "github.com/Coffee-Mail/coffee-mail-sdk-go"
)

const (
	liveKeyPrefix      = "cm_live_"
	keyPreviewLength   = 8
	keyPreviewSuffix   = "..."
	environmentLive    = "live"
	environmentTest    = "test"
	environmentSandbox = "sandbox"
	webhookActive      = "active"
	webhookInactive    = "inactive"
	percent            = 100.0
	rateScale          = 100.0
)

type introspectKeyResponse struct {
	Valid       bool     `json:"valid"`
	Environment string   `json:"environment"`
	Permissions []string `json:"permissions"`
	KeyPreview  string   `json:"keyPreview"`
}

type sendEmailResult struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type paginatedResult[T any] struct {
	Items   []T  `json:"items"`
	Total   int  `json:"total"`
	Page    int  `json:"page"`
	Limit   int  `json:"limit"`
	HasMore bool `json:"hasMore"`
}

type emailRecord struct {
	ID        string   `json:"id"`
	From      string   `json:"from"`
	To        []string `json:"to"`
	Subject   string   `json:"subject"`
	Status    string   `json:"status"`
	CreatedAt string   `json:"createdAt"`
}

type domainRecord struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	Status       string `json:"status"`
	DKIMSelector string `json:"dkimSelector,omitempty"`
	CreatedAt    string `json:"createdAt,omitempty"`
}

type templateRecord struct {
	ID        string  `json:"id"`
	Name      string  `json:"name"`
	Subject   *string `json:"subject"`
	Format    string  `json:"format"`
	CreatedAt string  `json:"createdAt"`
}

type audienceRecord struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	TotalContacts int    `json:"totalContacts"`
	CreatedAt     string `json:"createdAt"`
}

type contactRecord struct {
	ID        string  `json:"id"`
	Email     string  `json:"email"`
	FirstName *string `json:"firstName,omitempty"`
	LastName  *string `json:"lastName,omitempty"`
	CreatedAt string  `json:"createdAt"`
}

type suppressionRecord struct {
	ID        string `json:"id"`
	Email     string `json:"email"`
	Reason    string `json:"reason"`
	CreatedAt string `json:"createdAt"`
}

type webhookRecord struct {
	ID        string   `json:"id"`
	URL       string   `json:"url"`
	Events    []string `json:"events"`
	Status    string   `json:"status"`
	CreatedAt string   `json:"createdAt"`
}

type statsRecord struct {
	TotalSent      int     `json:"totalSent"`
	TotalDelivered int     `json:"totalDelivered"`
	TotalBounced   int     `json:"totalBounced"`
	DeliveryRate   float64 `json:"deliveryRate"`
}

func timestamp(t time.Time) string {
	return t.UTC().Format(time.RFC3339Nano)
}

func keyPreview(apiKey string) string {
	if apiKey == "" {
		return ""
	}
	return apiKey[:min(keyPreviewLength, len(apiKey))] + keyPreviewSuffix
}

func environmentOf(apiKey string) string {
	if strings.HasPrefix(apiKey, liveKeyPrefix) {
		return environmentLive
	}
	return environmentTest
}

func deliveryRate(sent, delivered int) float64 {
	if sent <= 0 {
		return 0
	}
	return math.Round(float64(delivered)*percent/float64(sent)*rateScale) / rateScale
}

func toEmailRecord(email coffeemail.Email) emailRecord {
	return emailRecord{
		ID:        email.ID,
		From:      email.From,
		To:        email.To,
		Subject:   valueOr(email.Subject, ""),
		Status:    string(email.Status),
		CreatedAt: timestamp(email.CreatedAt),
	}
}

func toTemplateRecord(template coffeemail.Template) templateRecord {
	return templateRecord{
		ID:        template.ID,
		Name:      template.Name,
		Subject:   template.Subject,
		Format:    string(template.Format),
		CreatedAt: timestamp(template.CreatedAt),
	}
}

func toAudienceRecord(audience coffeemail.Audience) audienceRecord {
	return audienceRecord{
		ID:            audience.ID,
		Name:          audience.Name,
		TotalContacts: audience.TotalContacts,
		CreatedAt:     timestamp(audience.CreatedAt),
	}
}

func toContactRecord(contact coffeemail.Contact) contactRecord {
	return contactRecord{
		ID:        contact.ID,
		Email:     contact.Email,
		FirstName: contact.FirstName,
		LastName:  contact.LastName,
		CreatedAt: timestamp(contact.CreatedAt),
	}
}

func toSuppressionRecord(suppression coffeemail.Suppression) suppressionRecord {
	return suppressionRecord{
		ID:        suppression.ID,
		Email:     suppression.Email,
		Reason:    string(suppression.Reason),
		CreatedAt: timestamp(suppression.CreatedAt),
	}
}

func toWebhookRecord(id, url string, events []coffeemail.WebhookEvent, status coffeemail.WebhookStatus, createdAt time.Time) webhookRecord {
	names := make([]string, 0, len(events))
	for _, event := range events {
		names = append(names, string(event))
	}
	return webhookRecord{ID: id, URL: url, Events: names, Status: webhookStatus(status), CreatedAt: timestamp(createdAt)}
}

func webhookStatus(status coffeemail.WebhookStatus) string {
	if status == coffeemail.WebhookStatusActive {
		return webhookActive
	}
	return webhookInactive
}

func mapItems[T, R any](items []T, convert func(T) R) []R {
	out := make([]R, 0, len(items))
	for _, item := range items {
		out = append(out, convert(item))
	}
	return out
}

func valueOr[T any](value *T, fallback T) T {
	if value == nil {
		return fallback
	}
	return *value
}

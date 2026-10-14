package main

import (
	"context"
	"net/http"
	"strings"
	"time"

	coffeemail "github.com/Coffee-Mail/coffee-mail-sdk-go"
)

const (
	apiKeyHeader = "x-coffeemail-api-key"
	prefix       = "/api/v1"

	msgSendRequired        = "Campos 'from', 'to' e 'subject' são obrigatórios."
	msgDomainRequired      = "O campo 'name' é obrigatório para cadastrar um domínio."
	msgTemplateRequired    = "Campos 'name', 'subject' e 'html' são obrigatórios."
	msgAudienceRequired    = "O campo 'name' é obrigatório para cadastrar uma audiência."
	msgContactRequired     = "O campo 'email' é obrigatório para cadastrar um contato."
	msgSuppressionRequired = "Campos 'email' e 'reason' são obrigatórios."
	msgWebhookRequired     = "Campos 'url' e array de 'events' são obrigatórios."
)

var templateFormats = map[string]coffeemail.TemplateFormat{
	string(coffeemail.TemplateFormatHTML):  coffeemail.TemplateFormatHTML,
	string(coffeemail.TemplateFormatReact): coffeemail.TemplateFormatReact,
}

var suppressionReasons = map[string]coffeemail.SuppressionReason{
	string(coffeemail.SuppressionReasonManual):    coffeemail.SuppressionReasonManual,
	string(coffeemail.SuppressionReasonBounce):    coffeemail.SuppressionReasonBounce,
	string(coffeemail.SuppressionReasonComplaint): coffeemail.SuppressionReasonComplaint,
}

var statsPeriods = map[string]coffeemail.StatsPeriod{
	string(coffeemail.StatsPeriodLast7Days):  coffeemail.StatsPeriodLast7Days,
	string(coffeemail.StatsPeriodLast30Days): coffeemail.StatsPeriodLast30Days,
	string(coffeemail.StatsPeriodLast90Days): coffeemail.StatsPeriodLast90Days,
}

type clientFactory func(apiKey string) (*coffeemail.Client, error)

type operation func(ctx context.Context, client *coffeemail.Client) (any, error)

type server struct {
	newClient clientFactory
}

func defaultClientFactory(apiKey string) (*coffeemail.Client, error) {
	return coffeemail.NewClient(apiKey, coffeemail.WithLocale(coffeemail.LocalePtBR))
}

func (s *server) routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET "+prefix+"/runner/info", func(w http.ResponseWriter, _ *http.Request) {
		respond(w, http.StatusOK, success(info(), time.Now()))
	})
	mux.HandleFunc("POST "+prefix+"/client/introspect", s.introspect)
	mux.HandleFunc("POST "+prefix+"/emails/send", s.sendEmail)
	mux.HandleFunc("GET "+prefix+"/emails", s.handle(listEmails))
	mux.HandleFunc("GET "+prefix+"/domains", s.handle(listDomains))
	mux.HandleFunc("POST "+prefix+"/domains", s.createDomain)
	mux.HandleFunc("POST "+prefix+"/domains/{id}/verify", s.handle(verifyDomain))
	mux.HandleFunc("GET "+prefix+"/domains/{id}/health", s.handle(domainHealth))
	mux.HandleFunc("GET "+prefix+"/templates", s.handle(listTemplates))
	mux.HandleFunc("POST "+prefix+"/templates", s.createTemplate)
	mux.HandleFunc("POST "+prefix+"/templates/{id}/preview", s.handle(previewTemplate))
	mux.HandleFunc("GET "+prefix+"/audiences", s.handle(listAudiences))
	mux.HandleFunc("POST "+prefix+"/audiences", s.createAudience)
	mux.HandleFunc("GET "+prefix+"/audiences/{id}/contacts", s.handle(listContacts))
	mux.HandleFunc("POST "+prefix+"/audiences/{id}/contacts", s.createContact)
	mux.HandleFunc("GET "+prefix+"/suppressions", s.handle(listSuppressions))
	mux.HandleFunc("POST "+prefix+"/suppressions", s.createSuppression)
	mux.HandleFunc("DELETE "+prefix+"/suppressions/{email}", s.handle(deleteSuppression))
	mux.HandleFunc("GET "+prefix+"/webhooks", s.handle(listWebhooks))
	mux.HandleFunc("POST "+prefix+"/webhooks", s.createWebhook)
	mux.HandleFunc("POST "+prefix+"/webhooks/{id}/test", s.handle(testWebhook))
	mux.HandleFunc("GET "+prefix+"/stats", s.handle(stats))
	return withCORS(mux)
}

type requestOperation func(r *http.Request) operation

func (s *server) handle(build requestOperation) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		s.run(w, r, http.StatusOK, build(r))
	}
}

func (s *server) run(w http.ResponseWriter, r *http.Request, status int, op operation) {
	start := time.Now()
	apiKey := strings.TrimSpace(r.Header.Get(apiKeyHeader))
	if apiKey == "" {
		respond(w, http.StatusBadRequest, failure(codeExecution, unauthenticatedMessage, executionErrorCode, start))
		return
	}
	client, err := s.newClient(apiKey)
	if err != nil {
		respond(w, http.StatusBadRequest, executionFailure(err, start))
		return
	}
	data, err := op(r.Context(), client)
	if err != nil {
		respond(w, http.StatusBadRequest, executionFailure(err, start))
		return
	}
	respond(w, status, success(data, start))
}

func (s *server) validated(w http.ResponseWriter, r *http.Request, valid bool, message string, op operation) {
	if !valid {
		respond(w, http.StatusBadRequest, failure(codeValidation, message, http.StatusBadRequest, time.Now()))
		return
	}
	s.run(w, r, http.StatusCreated, op)
}

func (s *server) introspect(w http.ResponseWriter, r *http.Request) {
	start := time.Now()
	apiKey := strings.TrimSpace(r.Header.Get(apiKeyHeader))
	invalid := introspectKeyResponse{Environment: environmentSandbox, Permissions: []string{}, KeyPreview: keyPreview(apiKey)}
	client, err := s.newClient(apiKey)
	if apiKey == "" || err != nil {
		respond(w, http.StatusOK, success(invalid, start))
		return
	}
	key, err := client.Introspect(r.Context())
	if err != nil {
		respond(w, http.StatusOK, success(invalid, start))
		return
	}
	respond(w, http.StatusOK, success(introspectKeyResponse{
		Valid:       true,
		Environment: environmentOf(apiKey),
		Permissions: key.Scopes,
		KeyPreview:  keyPreview(apiKey),
	}, start))
}

func (s *server) sendEmail(w http.ResponseWriter, r *http.Request) {
	body := decode[sendEmailRequest](r)
	to := recipients(body.To)
	valid := present(body.From, body.Subject) && len(to) > 0
	if !valid {
		respond(w, http.StatusBadRequest, failure(codeValidation, msgSendRequired, http.StatusBadRequest, time.Now()))
		return
	}
	s.run(w, r, http.StatusOK, sendEmail(body, to))
}

func (s *server) createDomain(w http.ResponseWriter, r *http.Request) {
	body := decode[createDomainRequest](r)
	s.validated(w, r, present(body.Name), msgDomainRequired, createDomain(body))
}

func (s *server) createTemplate(w http.ResponseWriter, r *http.Request) {
	body := decode[createTemplateRequest](r)
	s.validated(w, r, present(body.Name, body.Subject, body.HTML), msgTemplateRequired, createTemplate(body))
}

func (s *server) createAudience(w http.ResponseWriter, r *http.Request) {
	body := decode[createAudienceRequest](r)
	s.validated(w, r, present(body.Name), msgAudienceRequired, createAudience(body))
}

func (s *server) createContact(w http.ResponseWriter, r *http.Request) {
	body := decode[createContactRequest](r)
	s.validated(w, r, present(body.Email), msgContactRequired, createContact(r.PathValue("id"), body))
}

func (s *server) createSuppression(w http.ResponseWriter, r *http.Request) {
	body := decode[createSuppressionRequest](r)
	s.validated(w, r, present(body.Email, body.Reason), msgSuppressionRequired, createSuppression(body))
}

func (s *server) createWebhook(w http.ResponseWriter, r *http.Request) {
	body := decode[createWebhookRequest](r)
	s.validated(w, r, present(body.URL) && len(body.Events) > 0, msgWebhookRequired, createWebhook(body))
}

package main

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"

	coffeemail "github.com/Coffee-Mail/coffee-mail-sdk-go"
)

const liveKey = "cm_live_0123456789abcdef"

type sdkCall struct {
	method string
	path   string
	header http.Header
	body   string
}

type fakeAPI struct {
	mu       sync.Mutex
	status   int
	body     string
	requests []sdkCall
}

func (f *fakeAPI) RoundTrip(req *http.Request) (*http.Response, error) {
	raw, _ := io.ReadAll(req.Body)
	f.mu.Lock()
	defer f.mu.Unlock()
	f.requests = append(f.requests, sdkCall{method: req.Method, path: req.URL.Path, header: req.Header.Clone(), body: string(raw)})
	return &http.Response{
		StatusCode: f.status,
		Header:     http.Header{"Content-Type": {"application/json"}},
		Body:       io.NopCloser(strings.NewReader(f.body)),
	}, nil
}

func newRunner(t *testing.T, status int, body string) (*httptest.Server, *fakeAPI) {
	t.Helper()
	api := &fakeAPI{status: status, body: body}
	srv := &server{newClient: func(apiKey string) (*coffeemail.Client, error) {
		return coffeemail.NewClient(apiKey, coffeemail.WithHTTPClient(&http.Client{Transport: api}))
	}}
	runner := httptest.NewServer(srv.routes())
	t.Cleanup(runner.Close)
	return runner, api
}

type reply struct {
	status int
	body   map[string]any
}

func call(t *testing.T, runner *httptest.Server, method, path, apiKey, body string) reply {
	t.Helper()
	req, err := http.NewRequest(method, runner.URL+path, bytes.NewBufferString(body))
	if err != nil {
		t.Fatal(err)
	}
	if apiKey != "" {
		req.Header.Set(apiKeyHeader, apiKey)
	}
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	defer func() { _ = res.Body.Close() }()
	var decoded map[string]any
	if err := json.NewDecoder(res.Body).Decode(&decoded); err != nil {
		t.Fatal(err)
	}
	return reply{status: res.StatusCode, body: decoded}
}

func field(t *testing.T, value any, path ...string) any {
	t.Helper()
	current := value
	for _, key := range path {
		object, ok := current.(map[string]any)
		if !ok {
			t.Fatalf("caminho %v inexistente em %v", path, value)
		}
		current = object[key]
	}
	return current
}

func TestRunnerInfoIdentifiesTheGoSDK(t *testing.T) {
	runner, _ := newRunner(t, http.StatusOK, "{}")
	got := call(t, runner, http.MethodGet, "/api/v1/runner/info", "", "")
	if got.status != http.StatusOK || field(t, got.body, "success") != true {
		t.Fatalf("resposta = %v", got)
	}
	if field(t, got.body, "runner", "language") != "go" || field(t, got.body, "runner", "sdkVersion") != coffeemail.Version {
		t.Fatalf("runner = %v", got.body["runner"])
	}
	if field(t, got.body, "data", "status") != "online" {
		t.Fatalf("data = %v", got.body["data"])
	}
}

func TestSendEmailValidatesRequiredFields(t *testing.T) {
	runner, api := newRunner(t, http.StatusOK, "{}")
	got := call(t, runner, http.MethodPost, "/api/v1/emails/send", liveKey, `{"from":"a@b.com"}`)
	if got.status != http.StatusBadRequest || field(t, got.body, "error", "code") != "VALIDATION_ERROR" {
		t.Fatalf("resposta = %v", got)
	}
	if field(t, got.body, "error", "message") != msgSendRequired || len(api.requests) != 0 {
		t.Fatalf("mensagem = %v, chamadas = %d", field(t, got.body, "error", "message"), len(api.requests))
	}
}

func TestSendEmailUsesTheSDKAndMapsTheResult(t *testing.T) {
	runner, api := newRunner(t, http.StatusAccepted, `{"id":"eml_1","status":"queued","queuedAt":"2026-10-14T12:00:00Z"}`)
	got := call(t, runner, http.MethodPost, "/api/v1/emails/send", liveKey,
		`{"from":"a@b.com","to":"b@gmail.com","subject":"Oi","text":"Oi","tags":[{"name":"plano","value":"pro"}]}`)
	if got.status != http.StatusOK || field(t, got.body, "data", "id") != "eml_1" || field(t, got.body, "data", "createdAt") != "2026-10-14T12:00:00Z" {
		t.Fatalf("resposta = %v", got)
	}
	if _, ok := field(t, got.body, "executionTimeMs").(float64); !ok {
		t.Fatal("executionTimeMs deveria ser numérico")
	}
	sdk := api.requests[0]
	if !strings.Contains(sdk.body, `"to":[{"email":"b@gmail.com"}]`) || !strings.Contains(sdk.body, `"tags":[{"name":"plano","value":"pro"}]`) {
		t.Fatalf("corpo enviado ao SDK = %s", sdk.body)
	}
	if sdk.header.Get("Authorization") != "Bearer "+liveKey {
		t.Fatalf("Authorization = %q", sdk.header.Get("Authorization"))
	}
}

func TestMissingAPIKeyIsReportedWithoutCallingTheAPI(t *testing.T) {
	runner, api := newRunner(t, http.StatusOK, "{}")
	got := call(t, runner, http.MethodGet, "/api/v1/domains", "", "")
	if got.status != http.StatusBadRequest || field(t, got.body, "error", "code") != "RUNNER_EXECUTION_ERROR" {
		t.Fatalf("resposta = %v", got)
	}
	if !strings.HasPrefix(field(t, got.body, "error", "message").(string), "Chave de API não informada") || len(api.requests) != 0 {
		t.Fatalf("mensagem = %v", got.body["error"])
	}
}

func TestSDKErrorsBecomeRunnerExecutionErrors(t *testing.T) {
	runner, _ := newRunner(t, http.StatusNotFound, `{"error":{"code":"WEBHOOK_NOT_FOUND","message":"Webhook não encontrado"}}`)
	got := call(t, runner, http.MethodPost, "/api/v1/webhooks/w1/test", liveKey, "")
	if got.status != http.StatusBadRequest || field(t, got.body, "success") != false || got.body["data"] != nil {
		t.Fatalf("resposta = %v", got)
	}
	if field(t, got.body, "error", "message") != "Webhook não encontrado" || field(t, got.body, "error", "status") != float64(500) {
		t.Fatalf("erro = %v", got.body["error"])
	}
}

func TestIntrospectionReportsKeyValidity(t *testing.T) {
	runner, _ := newRunner(t, http.StatusOK, `{"id":"k1","name":"prod","organisationId":"o1","scopes":["full_access"]}`)
	withKey := call(t, runner, http.MethodPost, "/api/v1/client/introspect", liveKey, "")
	if field(t, withKey.body, "data", "valid") != true || field(t, withKey.body, "data", "environment") != "live" {
		t.Fatalf("com chave = %v", withKey.body["data"])
	}
	if field(t, withKey.body, "data", "permissions").([]any)[0] != "full_access" || field(t, withKey.body, "data", "keyPreview") != "cm_live_..." {
		t.Fatalf("com chave = %v", withKey.body["data"])
	}
	withoutKey := call(t, runner, http.MethodPost, "/api/v1/client/introspect", "", "")
	if field(t, withoutKey.body, "data", "valid") != false || field(t, withoutKey.body, "data", "environment") != "sandbox" {
		t.Fatalf("sem chave = %v", withoutKey.body["data"])
	}
}

func TestCreateRoutesValidateAndReturnCreated(t *testing.T) {
	cases := []struct {
		path, body, sdkBody, message string
	}{
		{"/api/v1/domains", `{"name":"exemplo.com.br"}`, `{"id":"d1","name":"exemplo.com.br","status":"pending","createdAt":"2026-10-14T12:00:00Z"}`, msgDomainRequired},
		{"/api/v1/templates", `{"name":"t","subject":"s","html":"<p/>","format":"react"}`, `{"id":"t1","name":"t","format":"react","createdAt":"2026-10-14T12:00:00Z"}`, msgTemplateRequired},
		{"/api/v1/audiences", `{"name":"Clientes"}`, `{"id":"a1","name":"Clientes","contactsCount":3,"createdAt":"2026-10-14T12:00:00Z"}`, msgAudienceRequired},
		{"/api/v1/audiences/a1/contacts", `{"email":"ana@gmail.com"}`, `{"id":"c1","email":"ana@gmail.com","createdAt":"2026-10-14T12:00:00Z"}`, msgContactRequired},
		{"/api/v1/suppressions", `{"email":"x@gmail.com","reason":"manual"}`, `{"id":"s1","email":"x@gmail.com","reason":"manual","createdAt":"2026-10-14T12:00:00Z"}`, msgSuppressionRequired},
		{"/api/v1/webhooks", `{"url":"https://x.com","events":["email.sent"]}`, `{"id":"w1","url":"https://x.com","events":["email.sent"],"createdAt":"2026-10-14T12:00:00Z","secret":"whsec_1"}`, msgWebhookRequired},
	}
	for _, tc := range cases {
		t.Run(tc.path, func(t *testing.T) {
			runner, api := newRunner(t, http.StatusCreated, tc.sdkBody)
			invalid := call(t, runner, http.MethodPost, tc.path, liveKey, `{}`)
			if invalid.status != http.StatusBadRequest || field(t, invalid.body, "error", "message") != tc.message {
				t.Fatalf("validação = %v", invalid)
			}
			created := call(t, runner, http.MethodPost, tc.path, liveKey, tc.body)
			if created.status != http.StatusCreated || field(t, created.body, "success") != true || len(api.requests) != 1 {
				t.Fatalf("criação = %v", created)
			}
		})
	}
}

func TestListRoutesMapPagination(t *testing.T) {
	runner, api := newRunner(t, http.StatusOK, `{"emails":[{"id":"e1","from":"a@b.com","to":["c@d.com"],"status":"sent","createdAt":"2026-10-14T12:00:00Z"}],"nextCursor":"c2"}`)
	got := call(t, runner, http.MethodGet, "/api/v1/emails?page=2&limit=500", liveKey, "")
	data := field(t, got.body, "data")
	if field(t, data, "page") != float64(2) || field(t, data, "limit") != float64(100) || field(t, data, "hasMore") != true {
		t.Fatalf("paginação = %v", data)
	}
	if api.requests[0].path != "/v1/product/emails" || !strings.Contains(api.requests[0].header.Get("User-Agent"), "coffeemail-go/") {
		t.Fatalf("chamada ao SDK = %+v", api.requests[0])
	}
}

func TestStatsComputesDeliveryRate(t *testing.T) {
	runner, _ := newRunner(t, http.StatusOK, `{"totalSent":3,"totalDelivered":2,"totalBounced":1}`)
	got := call(t, runner, http.MethodGet, "/api/v1/stats?period=last7d", liveKey, "")
	if field(t, got.body, "data", "deliveryRate") != 66.67 {
		t.Fatalf("stats = %v", got.body["data"])
	}
}

func TestCORSPreflight(t *testing.T) {
	runner, _ := newRunner(t, http.StatusOK, "{}")
	req, _ := http.NewRequest(http.MethodOptions, runner.URL+"/api/v1/emails/send", nil)
	res, err := http.DefaultClient.Do(req)
	if err != nil {
		t.Fatal(err)
	}
	_ = res.Body.Close()
	if res.StatusCode != http.StatusNoContent || !strings.Contains(res.Header.Get("Access-Control-Allow-Headers"), apiKeyHeader) {
		t.Fatalf("preflight = %d %v", res.StatusCode, res.Header)
	}
}

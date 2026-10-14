package br.com.coffeemail.workbench.runner;

import static org.assertj.core.api.Assertions.assertThat;

import br.com.coffeemail.CoffeeMail;
import br.com.coffeemail.transport.HttpRequest;
import br.com.coffeemail.transport.HttpResponse;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.javalin.Javalin;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest.BodyPublishers;
import java.net.http.HttpResponse.BodyHandlers;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CopyOnWriteArrayList;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

final class RunnerApplicationTest {

    private static final ObjectMapper MAPPER = new ObjectMapper();
    private static final String KEY = "cm_live_0123456789";
    private static final String SENT = "{\"id\":\"eml_1\",\"status\":\"queued\",\"queuedAt\":\"2026-10-14T12:00:00Z\"}";
    private static final String DOMAIN = "{\"id\":\"dom_1\",\"name\":\"loja.com.br\",\"status\":\"pending\",\"dkimRecordsToPublish\":[]}";
    private static final String STATS = "{\"totalSent\":3,\"totalDelivered\":2,\"totalBounced\":1,\"totalFailed\":0,"
            + "\"totalOpened\":0,\"totalClicked\":0,\"deliveryRate\":0,\"openRate\":0,\"clickRate\":0,\"topClients\":[],\"data\":[]}";
    private static final String INTROSPECTION = "{\"id\":\"k\",\"name\":\"n\",\"organisationId\":\"o\",\"scopes\":[\"full_access\"]}";
    private static final String NOT_FOUND = "{\"error\":{\"code\":\"WEBHOOK_NOT_FOUND\",\"message\":\"Webhook não encontrado\"}}";

    private final List<HttpRequest> sdkRequests = new CopyOnWriteArrayList<>();
    private final HttpClient http = HttpClient.newHttpClient();
    private final Javalin server =
            RunnerApplication.create(new ClientFactory(builder -> builder.transport((request, timeout) -> {
                sdkRequests.add(request);
                return CompletableFuture.completedFuture(respond(request));
            })));

    @BeforeEach
    void start() {
        server.start(0);
    }

    @AfterEach
    void stop() {
        server.stop();
    }

    private static HttpResponse respond(final HttpRequest request) {
        final String path = request.uri().getPath();
        if (path.endsWith("/emails")) {
            return new HttpResponse(202, Map.of(), SENT);
        }
        if (path.endsWith("/domains")) {
            return new HttpResponse(201, Map.of(), DOMAIN);
        }
        if (path.endsWith("/stats")) {
            return new HttpResponse(200, Map.of(), STATS);
        }
        if (path.endsWith("/api-key")) {
            return new HttpResponse(200, Map.of(), INTROSPECTION);
        }
        if (path.contains("/suppressions/")) {
            return new HttpResponse(204, Map.of(), "");
        }
        return new HttpResponse(404, Map.of(), NOT_FOUND);
    }

    private record Reply(int status, JsonNode body, java.net.http.HttpHeaders headers) {}

    private Reply call(final String method, final String path, final String body, final Map<String, String> headers)
            throws IOException, InterruptedException {
        final java.net.http.HttpRequest.Builder builder = java.net.http.HttpRequest.newBuilder(
                        URI.create("http://localhost:" + server.port() + path))
                .method(method, body.isEmpty() ? BodyPublishers.noBody() : BodyPublishers.ofString(body))
                .header("content-type", "application/json");
        headers.forEach(builder::header);
        final java.net.http.HttpResponse<String> response = http.send(builder.build(), BodyHandlers.ofString());
        final JsonNode json = response.body().isBlank() ? MAPPER.nullNode() : MAPPER.readTree(response.body());
        return new Reply(response.statusCode(), json, response.headers());
    }

    private Reply call(final String method, final String path, final String body) throws IOException, InterruptedException {
        return call(method, path, body, Map.of(RunnerRoutes.API_KEY_HEADER, KEY));
    }

    @Test
    void runnerInfoIdentifiesTheJavaSdk() throws Exception {
        final Reply reply = call("GET", "/api/v1/runner/info", "", Map.of());

        assertThat(reply.status()).isEqualTo(200);
        assertThat(reply.body().path("success").asBoolean()).isTrue();
        assertThat(reply.body().path("runner").path("language").asText()).isEqualTo("java");
        assertThat(reply.body().path("runner").path("sdkVersion").asText()).isEqualTo(CoffeeMail.version());
        assertThat(reply.body().path("data").path("status").asText()).isEqualTo("online");
    }

    @Test
    void sendEmailValidatesRequiredFields() throws Exception {
        final Reply reply = call("POST", "/api/v1/emails/send", "{\"from\":\"a@loja.com.br\"}");

        assertThat(reply.status()).isEqualTo(400);
        assertThat(reply.body().path("error").path("code").asText()).isEqualTo("VALIDATION_ERROR");
        assertThat(reply.body().path("error").path("message").asText())
                .isEqualTo("Campos 'from', 'to' e 'subject' são obrigatórios.");
        assertThat(sdkRequests).isEmpty();
    }

    @Test
    void sendEmailUsesTheSdkAndMapsTheResult() throws Exception {
        final Reply reply = call(
                "POST",
                "/api/v1/emails/send",
                "{\"from\":\"Loja <a@loja.com.br>\",\"to\":[\"b@gmail.com\",\"c@gmail.com\"],\"subject\":\"Oi\","
                        + "\"html\":\"<p>oi</p>\",\"tags\":[{\"name\":\"plano\",\"value\":\"pro\"}]}");

        assertThat(reply.status()).isEqualTo(200);
        assertThat(reply.body().path("data").path("id").asText()).isEqualTo("eml_1");
        assertThat(reply.body().path("data").path("createdAt").asText()).isEqualTo("2026-10-14T12:00:00Z");
        assertThat(reply.body().path("executionTimeMs").isNumber()).isTrue();
        final String sdkBody = sdkRequests.get(0).body().orElseThrow();
        assertThat(sdkBody).contains("\"to\":[{\"email\":\"b@gmail.com\"}]");
        assertThat(sdkBody).contains("\"tags\":[{\"name\":\"plano\",\"value\":\"pro\"}]");
        assertThat(sdkRequests.get(0).headers()).containsEntry("authorization", "Bearer " + KEY);
    }

    @Test
    void missingApiKeyIsReportedWithoutCallingTheApi() throws Exception {
        final Reply reply = call("GET", "/api/v1/domains", "", Map.of());

        assertThat(reply.status()).isEqualTo(400);
        assertThat(reply.body().path("error").path("code").asText()).isEqualTo("RUNNER_EXECUTION_ERROR");
        assertThat(reply.body().path("error").path("message").asText()).startsWith("Chave de API não informada");
        assertThat(sdkRequests).isEmpty();
    }

    @Test
    void sdkErrorsBecomeRunnerExecutionErrors() throws Exception {
        final Reply reply = call("POST", "/api/v1/webhooks/wh_1/test", "");

        assertThat(reply.status()).isEqualTo(400);
        assertThat(reply.body().path("success").asBoolean()).isFalse();
        assertThat(reply.body().path("data").isNull()).isTrue();
        assertThat(reply.body().path("error").path("message").asText()).isEqualTo("Webhook não encontrado");
        assertThat(reply.body().path("error").path("status").asInt()).isEqualTo(500);
    }

    @Test
    void introspectionReportsKeyValidity() throws Exception {
        final Reply withKey = call("POST", "/api/v1/client/introspect", "");
        final Reply withoutKey = call("POST", "/api/v1/client/introspect", "", Map.of());

        assertThat(withKey.body().path("data").path("valid").asBoolean()).isTrue();
        assertThat(withKey.body().path("data").path("environment").asText()).isEqualTo("live");
        assertThat(withKey.body().path("data").path("permissions").get(0).asText()).isEqualTo("full_access");
        assertThat(withKey.body().path("data").path("keyPreview").asText()).isEqualTo("cm_live_...");
        assertThat(withoutKey.body().path("data").path("valid").asBoolean()).isFalse();
        assertThat(withoutKey.body().path("data").path("environment").asText()).isEqualTo("sandbox");
    }

    @Test
    void createDomainReturns201AndAlwaysTargetsTheOfficialApi() throws Exception {
        final Reply reply = call(
                "POST",
                "/api/v1/domains",
                "{\"name\":\"loja.com.br\"}",
                Map.of(RunnerRoutes.API_KEY_HEADER, KEY, "x-coffeemail-base-url", "http://localhost:3030"));

        assertThat(reply.status()).isEqualTo(201);
        assertThat(reply.body().path("data").path("createdAt").asText()).isNotBlank();
        assertThat(reply.body().path("data").has("dkimSelector")).isFalse();
        assertThat(sdkRequests.get(0).uri()).hasToString("https://api.coffeemail.com.br/v1/product/domains");
    }

    @Test
    void statsComputeDeliveryRate() throws Exception {
        final Reply reply = call("GET", "/api/v1/stats?period=last7d", "");

        assertThat(reply.body().path("data").path("deliveryRate").asDouble()).isEqualTo(66.67);
        assertThat(sdkRequests.get(0).uri().getQuery()).isEqualTo("period=last7d");
    }

    @Test
    void deleteSuppressionReturnsTrue() throws Exception {
        final Reply reply = call("DELETE", "/api/v1/suppressions/sup_1", "");

        assertThat(reply.status()).isEqualTo(200);
        assertThat(reply.body().path("data").asBoolean()).isTrue();
        assertThat(sdkRequests.get(0).uri().getPath()).isEqualTo("/v1/product/suppressions/sup_1");
    }

    @Test
    void corsAllowsTheWorkbenchUi() throws Exception {
        final Reply reply = call(
                "GET", "/api/v1/runner/info", "", Map.of("Origin", "http://localhost:5173"));

        assertThat(reply.headers().firstValue("access-control-allow-origin")).isPresent();
    }
}

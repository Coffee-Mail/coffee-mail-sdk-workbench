package br.com.coffeemail.workbench.runner;

import br.com.coffeemail.workbench.runner.dto.CreateAudienceRequest;
import br.com.coffeemail.workbench.runner.dto.CreateContactRequest;
import br.com.coffeemail.workbench.runner.dto.CreateDomainRequest;
import br.com.coffeemail.workbench.runner.dto.CreateSuppressionRequest;
import br.com.coffeemail.workbench.runner.dto.CreateTemplateRequest;
import br.com.coffeemail.workbench.runner.dto.CreateWebhookRequest;
import br.com.coffeemail.workbench.runner.dto.RunnerError;
import br.com.coffeemail.workbench.runner.dto.SendEmailRequest;
import br.com.coffeemail.workbench.runner.dto.StandardResponse;
import io.javalin.config.RoutesConfig;
import io.javalin.http.Context;
import io.javalin.http.HttpStatus;
import java.util.Optional;
import java.util.function.Predicate;
import org.jspecify.annotations.Nullable;

/** Rotas do Runner API, com as mesmas validações e status HTTP do runner Node. */
public final class RunnerRoutes {

    static final String API_KEY_HEADER = "x-coffeemail-api-key";
    private static final String PREFIX = "/api/v1";
    private static final String ID = "id";
    private static final String EMAIL = "email";
    private static final String VALIDATION_ERROR = "VALIDATION_ERROR";
    private static final int DEFAULT_PAGE = 1;
    private static final int DEFAULT_LIMIT = 10;
    private static final int MAX_LIMIT = 100;

    private final RunnerService service;

    public RunnerRoutes(final RunnerService service) {
        this.service = service;
    }

    public void register(final RoutesConfig routes) {
        routes.get(PREFIX + "/runner/info", ctx -> respond(ctx, RunnerService.success(RunnerService.info(), System.nanoTime()), HttpStatus.OK));
        routes.post(PREFIX + "/client/introspect", this::introspect);
        routes.post(PREFIX + "/emails/send", this::sendEmail);
        routes.get(PREFIX + "/emails", ctx -> run(ctx, SdkAdapter.listEmails(page(ctx), limit(ctx)), HttpStatus.OK));
        routes.get(PREFIX + "/domains", ctx -> run(ctx, SdkAdapter.listDomains(), HttpStatus.OK));
        routes.post(PREFIX + "/domains", this::createDomain);
        routes.post(PREFIX + "/domains/{id}/verify", ctx -> run(ctx, SdkAdapter.verifyDomain(ctx.pathParam(ID)), HttpStatus.OK));
        routes.get(PREFIX + "/domains/{id}/health", ctx -> run(ctx, SdkAdapter.domainHealth(ctx.pathParam(ID)), HttpStatus.OK));
        routes.get(PREFIX + "/templates", ctx -> run(ctx, SdkAdapter.listTemplates(page(ctx), limit(ctx)), HttpStatus.OK));
        routes.post(PREFIX + "/templates", this::createTemplate);
        routes.post(PREFIX + "/templates/{id}/preview", ctx -> run(ctx, SdkAdapter.previewTemplate(ctx.pathParam(ID)), HttpStatus.OK));
        routes.get(PREFIX + "/audiences", ctx -> run(ctx, SdkAdapter.listAudiences(), HttpStatus.OK));
        routes.post(PREFIX + "/audiences", this::createAudience);
        routes.get(PREFIX + "/audiences/{id}/contacts", ctx -> run(ctx, SdkAdapter.listContacts(ctx.pathParam(ID), page(ctx), limit(ctx)), HttpStatus.OK));
        routes.post(PREFIX + "/audiences/{id}/contacts", this::createContact);
        routes.get(PREFIX + "/suppressions", ctx -> run(ctx, SdkAdapter.listSuppressions(page(ctx), limit(ctx)), HttpStatus.OK));
        routes.post(PREFIX + "/suppressions", this::createSuppression);
        routes.delete(PREFIX + "/suppressions/{email}", ctx -> run(ctx, SdkAdapter.deleteSuppression(ctx.pathParam(EMAIL)), HttpStatus.OK));
        routes.get(PREFIX + "/webhooks", ctx -> run(ctx, SdkAdapter.listWebhooks(), HttpStatus.OK));
        routes.post(PREFIX + "/webhooks", this::createWebhook);
        routes.post(PREFIX + "/webhooks/{id}/test", ctx -> run(ctx, SdkAdapter.testWebhook(ctx.pathParam(ID)), HttpStatus.OK));
        routes.get(PREFIX + "/stats", ctx -> run(
                ctx,
                SdkAdapter.stats(query(ctx, "startDate"), query(ctx, "endDate"), query(ctx, "period")),
                HttpStatus.OK));
    }

    private void introspect(final Context ctx) {
        final long start = System.nanoTime();
        final RequestContext context = context(ctx);
        respond(ctx, RunnerService.success(SdkAdapter.introspect(context, service.client(context)), start), HttpStatus.OK);
    }

    private void sendEmail(final Context ctx) {
        final SendEmailRequest body = ctx.bodyAsClass(SendEmailRequest.class);
        final com.fasterxml.jackson.databind.JsonNode to = body.to();
        final boolean valid = present(body.from()) && to != null && !to.isNull() && present(body.subject());
        validated(ctx, valid, "Campos 'from', 'to' e 'subject' são obrigatórios.", () -> run(ctx, SdkAdapter.sendEmail(body), HttpStatus.OK));
    }

    private void createDomain(final Context ctx) {
        final CreateDomainRequest body = ctx.bodyAsClass(CreateDomainRequest.class);
        validated(ctx, present(body.name()), "O campo 'name' é obrigatório para cadastrar um domínio.", () -> run(ctx, SdkAdapter.createDomain(Nullables.orEmpty(body.name())), HttpStatus.CREATED));
    }

    private void createTemplate(final Context ctx) {
        final CreateTemplateRequest body = ctx.bodyAsClass(CreateTemplateRequest.class);
        final boolean valid = present(body.name()) && present(body.subject()) && present(body.html());
        validated(ctx, valid, "Campos 'name', 'subject' e 'html' são obrigatórios.", () -> run(ctx, SdkAdapter.createTemplate(body), HttpStatus.CREATED));
    }

    private void createAudience(final Context ctx) {
        final CreateAudienceRequest body = ctx.bodyAsClass(CreateAudienceRequest.class);
        validated(ctx, present(body.name()), "O campo 'name' é obrigatório para cadastrar uma audiência.", () -> run(ctx, SdkAdapter.createAudience(body), HttpStatus.CREATED));
    }

    private void createContact(final Context ctx) {
        final CreateContactRequest body = ctx.bodyAsClass(CreateContactRequest.class);
        validated(ctx, present(body.email()), "O campo 'email' é obrigatório para cadastrar um contato.", () -> run(ctx, SdkAdapter.createContact(ctx.pathParam(ID), body), HttpStatus.CREATED));
    }

    private void createSuppression(final Context ctx) {
        final CreateSuppressionRequest body = ctx.bodyAsClass(CreateSuppressionRequest.class);
        final boolean valid = present(body.email()) && present(body.reason());
        validated(ctx, valid, "Campos 'email' e 'reason' são obrigatórios.", () -> run(ctx, SdkAdapter.createSuppression(body), HttpStatus.CREATED));
    }

    private void createWebhook(final Context ctx) {
        final CreateWebhookRequest body = ctx.bodyAsClass(CreateWebhookRequest.class);
        final boolean valid = present(body.url()) && !Nullables.orEmpty(body.events()).isEmpty();
        validated(ctx, valid, "Campos 'url' e array de 'events' são obrigatórios.", () -> run(ctx, SdkAdapter.createWebhook(body), HttpStatus.CREATED));
    }

    private <T> void run(
            final Context ctx,
            final java.util.function.Function<br.com.coffeemail.CoffeeMail, br.com.coffeemail.CoffeeMailResponse<T>> operation,
            final HttpStatus successStatus) {
        final StandardResponse<T> result = service.execute(context(ctx), operation);
        respond(ctx, result, result.success() ? successStatus : HttpStatus.BAD_REQUEST);
    }

    private static void validated(final Context ctx, final boolean valid, final String message, final Runnable action) {
        if (!valid) {
            respond(
                    ctx,
                    new StandardResponse<>(false, RunnerService.info(), 0, null,
                            new RunnerError(VALIDATION_ERROR, message, HttpStatus.BAD_REQUEST.getCode(), null)),
                    HttpStatus.BAD_REQUEST);
            return;
        }
        action.run();
    }

    private static void respond(final Context ctx, final StandardResponse<?> response, final HttpStatus status) {
        ctx.status(status).json(response);
    }

    private static RequestContext context(final Context ctx) {
        return new RequestContext(
                Optional.ofNullable(ctx.header(API_KEY_HEADER)).map(String::strip).orElse(""));
    }

    private static boolean present(final @Nullable String value) {
        return Nullables.isPresent(value);
    }

    private static Optional<String> query(final Context ctx, final String name) {
        return Optional.ofNullable(ctx.queryParam(name)).filter(Predicate.not(String::isBlank));
    }

    private static int page(final Context ctx) {
        return Math.max(DEFAULT_PAGE, number(ctx, "page", DEFAULT_PAGE));
    }

    private static int limit(final Context ctx) {
        return Math.min(MAX_LIMIT, Math.max(1, number(ctx, "limit", DEFAULT_LIMIT)));
    }

    private static int number(final Context ctx, final String name, final int fallback) {
        return query(ctx, name).filter(value -> value.matches("\\d{1,9}")).map(Integer::parseInt).orElse(fallback);
    }
}

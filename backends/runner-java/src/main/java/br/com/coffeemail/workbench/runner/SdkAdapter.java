package br.com.coffeemail.workbench.runner;

import br.com.coffeemail.CoffeeMail;
import br.com.coffeemail.CoffeeMailResponse;
import br.com.coffeemail.models.audiences.AudienceDetail;
import br.com.coffeemail.models.audiences.ContactDetail;
import br.com.coffeemail.models.audiences.CreateAudienceInput;
import br.com.coffeemail.models.audiences.CreateContactInput;
import br.com.coffeemail.models.common.OffsetPaginationQuery;
import br.com.coffeemail.models.domains.DomainHealthResponse;
import br.com.coffeemail.models.domains.VerifyDomainResponse;
import br.com.coffeemail.models.emails.EmailDetail;
import br.com.coffeemail.models.emails.EmailTag;
import br.com.coffeemail.models.emails.ListEmailsQuery;
import br.com.coffeemail.models.emails.SendEmailInput;
import br.com.coffeemail.models.stats.GetStatsQuery;
import br.com.coffeemail.models.stats.StatsPeriod;
import br.com.coffeemail.models.suppressions.CreateSuppressionInput;
import br.com.coffeemail.models.suppressions.CreateSuppressionReason;
import br.com.coffeemail.models.suppressions.ListSuppressionsQuery;
import br.com.coffeemail.models.suppressions.SuppressionDetail;
import br.com.coffeemail.models.templates.CreateTemplateInput;
import br.com.coffeemail.models.templates.PreviewTemplateResponse;
import br.com.coffeemail.models.templates.TemplateDetail;
import br.com.coffeemail.models.templates.TemplateFormat;
import br.com.coffeemail.models.webhooks.CreateWebhookInput;
import br.com.coffeemail.models.webhooks.TestWebhookResult;
import br.com.coffeemail.models.webhooks.WebhookEventType;
import br.com.coffeemail.models.webhooks.WebhookStatus;
import br.com.coffeemail.workbench.runner.dto.AudienceRecord;
import br.com.coffeemail.workbench.runner.dto.ContactRecord;
import br.com.coffeemail.workbench.runner.dto.CreateAudienceRequest;
import br.com.coffeemail.workbench.runner.dto.CreateContactRequest;
import br.com.coffeemail.workbench.runner.dto.CreateSuppressionRequest;
import br.com.coffeemail.workbench.runner.dto.CreateTemplateRequest;
import br.com.coffeemail.workbench.runner.dto.CreateWebhookRequest;
import br.com.coffeemail.workbench.runner.dto.DomainRecord;
import br.com.coffeemail.workbench.runner.dto.EmailRecord;
import br.com.coffeemail.workbench.runner.dto.IntrospectKeyResponse;
import br.com.coffeemail.workbench.runner.dto.PaginatedResult;
import br.com.coffeemail.workbench.runner.dto.SendEmailRequest;
import br.com.coffeemail.workbench.runner.dto.SendEmailResult;
import br.com.coffeemail.workbench.runner.dto.StatsRecord;
import br.com.coffeemail.workbench.runner.dto.SuppressionRecord;
import br.com.coffeemail.workbench.runner.dto.TemplateRecord;
import br.com.coffeemail.workbench.runner.dto.WebhookRecord;
import com.fasterxml.jackson.databind.JsonNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.StreamSupport;
import org.jspecify.annotations.Nullable;

/** Traduz os DTOs do Runner API para chamadas do SDK Java e as respostas do SDK de volta para os DTOs. */
public final class SdkAdapter {

    private static final String LIVE_KEY_PREFIX = "cm_live_";
    private static final int KEY_PREVIEW_LENGTH = 8;
    private static final String KEY_PREVIEW_SUFFIX = "...";
    private static final String STATUS_ACTIVE = "active";
    private static final String STATUS_INACTIVE = "inactive";
    private static final double PERCENT = 100.0;
    private static final int RATE_SCALE = 2;

    private SdkAdapter() {}

    public static IntrospectKeyResponse introspect(final RequestContext context, final Optional<CoffeeMail> client) {
        final String preview = context.apiKey().isBlank() ? "" : keyPreview(context.apiKey());
        final IntrospectKeyResponse invalid = new IntrospectKeyResponse(false, "sandbox", List.of(), preview);
        return client.flatMap(sdk -> sdk.introspect().data())
                .map(key -> new IntrospectKeyResponse(
                        true,
                        context.apiKey().startsWith(LIVE_KEY_PREFIX) ? "live" : "test",
                        key.scopes(),
                        preview))
                .orElse(invalid);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<SendEmailResult>> sendEmail(final SendEmailRequest request) {
        final SendEmailInput.Builder builder =
                SendEmailInput.builder(Nullables.orEmpty(request.from()), firstRecipient(request.to()))
                        .subject(Nullables.orEmpty(request.subject()));
        Nullables.ifPresent(request.html(), builder::html);
        Nullables.ifPresent(request.text(), builder::text);
        Nullables.ifPresent(request.replyTo(), builder::replyTo);
        final List<EmailTag> tags = Nullables.orEmpty(request.tags()).stream()
                .map(tag -> new EmailTag(tag.name(), tag.value()))
                .toList();
        if (!tags.isEmpty()) {
            builder.tags(tags);
        }
        final SendEmailInput input = builder.build();
        return client -> client.emails()
                .send(input)
                .map(sent -> new SendEmailResult(sent.id(), sent.status().value(), sent.queuedAt().toString()));
    }

    public static Function<CoffeeMail, CoffeeMailResponse<PaginatedResult<EmailRecord>>> listEmails(
            final int page, final int limit) {
        return client -> client.emails()
                .list(ListEmailsQuery.builder().limit(limit).build())
                .map(result -> {
                    final List<EmailRecord> items =
                            result.emails().stream().map(SdkAdapter::toEmailRecord).toList();
                    return new PaginatedResult<>(items, items.size(), page, limit, result.nextCursor().isPresent());
                });
    }

    public static Function<CoffeeMail, CoffeeMailResponse<List<DomainRecord>>> listDomains() {
        return client -> client.domains()
                .list()
                .map(result -> result.domains().stream()
                        .map(domain -> new DomainRecord(
                                domain.id(),
                                domain.name(),
                                domain.status().value(),
                                domain.dkimSelector(),
                                domain.createdAt().toString()))
                        .toList());
    }

    public static Function<CoffeeMail, CoffeeMailResponse<DomainRecord>> createDomain(final String name) {
        return client -> client.domains()
                .create(name)
                .map(created -> new DomainRecord(
                        created.id(),
                        created.name(),
                        created.status().value(),
                        null,
                        created.createdAt().orElseGet(Instant::now).toString()));
    }

    public static Function<CoffeeMail, CoffeeMailResponse<VerifyDomainResponse>> verifyDomain(final String id) {
        return client -> client.domains().verify(id);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<DomainHealthResponse>> domainHealth(final String id) {
        return client -> client.domains().getHealth(id);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<PaginatedResult<TemplateRecord>>> listTemplates(
            final int page, final int limit) {
        return client -> client.templates().list().map(result -> {
            final List<TemplateRecord> items =
                    result.templates().stream().map(SdkAdapter::toTemplateRecord).toList();
            return new PaginatedResult<>(items, items.size(), page, limit, false);
        });
    }

    public static Function<CoffeeMail, CoffeeMailResponse<TemplateRecord>> createTemplate(
            final CreateTemplateRequest request) {
        final CreateTemplateInput.Builder builder = CreateTemplateInput.builder(
                        Nullables.orEmpty(request.name()), Nullables.orEmpty(request.html()))
                .subject(Nullables.orEmpty(request.subject()));
        Nullables.ifPresent(request.format(), format -> templateFormat(format).ifPresent(builder::format));
        final CreateTemplateInput input = builder.build();
        return client -> client.templates().create(input).map(SdkAdapter::toTemplateRecord);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<PreviewTemplateResponse>> previewTemplate(final String id) {
        return client -> client.templates().previewById(id);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<List<AudienceRecord>>> listAudiences() {
        return client -> client.audiences()
                .list()
                .map(result -> result.audiences().stream().map(SdkAdapter::toAudienceRecord).toList());
    }

    public static Function<CoffeeMail, CoffeeMailResponse<AudienceRecord>> createAudience(
            final CreateAudienceRequest request) {
        final CreateAudienceInput.Builder builder =
                CreateAudienceInput.builder(Nullables.orEmpty(request.name()));
        Nullables.ifPresent(request.description(), builder::description);
        final CreateAudienceInput input = builder.build();
        return client -> client.audiences()
                .create(input)
                .map(audience ->
                        new AudienceRecord(audience.id(), audience.name(), 0, audience.createdAt().toString()));
    }

    public static Function<CoffeeMail, CoffeeMailResponse<PaginatedResult<ContactRecord>>> listContacts(
            final String audienceId, final int page, final int limit) {
        return client -> client.audiences()
                .contacts()
                .list(audienceId, OffsetPaginationQuery.builder().limit(limit).build())
                .map(result -> {
                    final List<ContactRecord> items =
                            result.contacts().stream().map(SdkAdapter::toContactRecord).toList();
                    return new PaginatedResult<>(items, result.total(), page, limit, false);
                });
    }

    public static Function<CoffeeMail, CoffeeMailResponse<ContactRecord>> createContact(
            final String audienceId, final CreateContactRequest request) {
        final CreateContactInput.Builder builder =
                CreateContactInput.builder(Nullables.orEmpty(request.email()));
        Nullables.ifPresent(request.firstName(), builder::firstName);
        Nullables.ifPresent(request.lastName(), builder::lastName);
        final CreateContactInput input = builder.build();
        return client -> client.audiences().contacts().create(audienceId, input).map(SdkAdapter::toContactRecord);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<PaginatedResult<SuppressionRecord>>> listSuppressions(
            final int page, final int limit) {
        return client -> client.suppressions()
                .list(ListSuppressionsQuery.builder().limit(limit).build())
                .map(result -> {
                    final List<SuppressionRecord> items =
                            result.suppressions().stream().map(SdkAdapter::toSuppressionRecord).toList();
                    return new PaginatedResult<>(items, items.size(), page, limit, result.nextCursor().isPresent());
                });
    }

    public static Function<CoffeeMail, CoffeeMailResponse<SuppressionRecord>> createSuppression(
            final CreateSuppressionRequest request) {
        final CreateSuppressionInput.Builder builder =
                CreateSuppressionInput.builder(Nullables.orEmpty(request.email()));
        Nullables.ifPresent(request.reason(), reason -> suppressionReason(reason).ifPresent(builder::reason));
        final CreateSuppressionInput input = builder.build();
        return client -> client.suppressions().create(input).map(SdkAdapter::toSuppressionRecord);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<Boolean>> deleteSuppression(final String id) {
        return client -> client.suppressions().delete(id).map(deleted -> Boolean.TRUE);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<List<WebhookRecord>>> listWebhooks() {
        return client -> client.webhooks()
                .list()
                .map(result -> result.webhooks().stream()
                        .map(webhook -> new WebhookRecord(
                                webhook.id(),
                                webhook.url(),
                                eventNames(webhook.events()),
                                webhook.status() == WebhookStatus.ACTIVE ? STATUS_ACTIVE : STATUS_INACTIVE,
                                webhook.createdAt().toString()))
                        .toList());
    }

    public static Function<CoffeeMail, CoffeeMailResponse<WebhookRecord>> createWebhook(
            final CreateWebhookRequest request) {
        final List<WebhookEventType> events = Nullables.orEmpty(request.events()).stream()
                .map(SdkAdapter::webhookEvent)
                .toList();
        final CreateWebhookInput input =
                CreateWebhookInput.builder(Nullables.orEmpty(request.url()), events).build();
        return client -> client.webhooks()
                .create(input)
                .map(created -> new WebhookRecord(
                        created.id(),
                        created.url(),
                        eventNames(created.events()),
                        STATUS_ACTIVE,
                        created.createdAt().toString()));
    }

    public static Function<CoffeeMail, CoffeeMailResponse<TestWebhookResult>> testWebhook(final String id) {
        return client -> client.webhooks().test(id);
    }

    public static Function<CoffeeMail, CoffeeMailResponse<StatsRecord>> stats(
            final Optional<String> startDate, final Optional<String> endDate, final Optional<String> period) {
        final GetStatsQuery.Builder builder = GetStatsQuery.builder();
        startDate.ifPresent(builder::startDate);
        endDate.ifPresent(builder::endDate);
        period.flatMap(SdkAdapter::statsPeriod).ifPresent(builder::period);
        final GetStatsQuery query = builder.build();
        return client -> client.stats().get(query).map(stats -> new StatsRecord(
                stats.totalSent(),
                stats.totalDelivered(),
                stats.totalBounced(),
                deliveryRate(stats.totalSent(), stats.totalDelivered())));
    }

    private static String firstRecipient(final @Nullable JsonNode to) {
        if (to == null) {
            return "";
        }
        if (to.isArray()) {
            return StreamSupport.stream(to.spliterator(), false)
                    .map(JsonNode::asText)
                    .findFirst()
                    .orElse("");
        }
        return to.asText();
    }

    private static String keyPreview(final String apiKey) {
        return apiKey.substring(0, Math.min(KEY_PREVIEW_LENGTH, apiKey.length())) + KEY_PREVIEW_SUFFIX;
    }

    private static double deliveryRate(final int sent, final int delivered) {
        if (sent <= 0) {
            return 0;
        }
        return BigDecimal.valueOf(delivered * PERCENT / sent).setScale(RATE_SCALE, RoundingMode.HALF_UP).doubleValue();
    }

    private static EmailRecord toEmailRecord(final EmailDetail email) {
        return new EmailRecord(
                email.id(),
                email.from(),
                email.to(),
                email.subject().orElse(""),
                email.status().value(),
                email.createdAt().toString());
    }

    private static TemplateRecord toTemplateRecord(final TemplateDetail template) {
        return new TemplateRecord(
                template.id(),
                template.name(),
                template.subject().orElse(null),
                template.format().value(),
                template.createdAt().toString());
    }

    private static AudienceRecord toAudienceRecord(final AudienceDetail audience) {
        return new AudienceRecord(
                audience.id(), audience.name(), audience.totalContacts(), audience.createdAt().toString());
    }

    private static ContactRecord toContactRecord(final ContactDetail contact) {
        return new ContactRecord(
                contact.id(),
                contact.email(),
                contact.firstName().orElse(null),
                contact.lastName().orElse(null),
                contact.createdAt().toString());
    }

    private static SuppressionRecord toSuppressionRecord(final SuppressionDetail suppression) {
        return new SuppressionRecord(
                suppression.id(),
                suppression.email(),
                suppression.reason().value(),
                suppression.createdAt().toString());
    }

    private static List<String> eventNames(final List<WebhookEventType> events) {
        return events.stream().map(WebhookEventType::value).toList();
    }

    private static WebhookEventType webhookEvent(final String value) {
        return Arrays.stream(WebhookEventType.values())
                .filter(type -> type.value().equals(value))
                .findFirst()
                .orElse(WebhookEventType.UNKNOWN);
    }

    private static Optional<TemplateFormat> templateFormat(final String value) {
        return Arrays.stream(TemplateFormat.values()).filter(format -> format.value().equals(value)).findFirst();
    }

    private static Optional<CreateSuppressionReason> suppressionReason(final String value) {
        return Arrays.stream(CreateSuppressionReason.values())
                .filter(reason -> reason.value().equals(value))
                .findFirst();
    }

    private static Optional<StatsPeriod> statsPeriod(final String value) {
        return Arrays.stream(StatsPeriod.values()).filter(period -> period.value().equals(value)).findFirst();
    }
}

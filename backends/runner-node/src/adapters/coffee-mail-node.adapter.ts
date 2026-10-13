import { COFFEEMAIL_VERSION } from "@coffeemail/node";
import { CoffeeMail } from "@coffeemail/node";
import type {
  AudienceRecordDTO,
  ContactRecordDTO,
  CreateAudienceRequestDTO,
  CreateContactRequestDTO,
  CreateDomainRequestDTO,
  CreateSuppressionRequestDTO,
  CreateTemplateRequestDTO,
  CreateWebhookRequestDTO,
  DomainRecordDTO,
  EmailDetailDTO,
  IntrospectKeyResponseDTO,
  PaginatedResultDTO,
  PaginationParamsDTO,
  RunnerInfoDTO,
  SendEmailRequestDTO,
  SendEmailResponseDTO,
  StatsQueryDTO,
  StatsRecordDTO,
  SuppressionRecordDTO,
  TemplateRecordDTO,
  WebhookRecordDTO,
} from "@coffeemail/workbench-contracts";
import type { ICoffeeMailSdkAdapter } from "./coffee-mail-adapter.interface.js";
import type { RequestExecutionContext } from "../types/context.js";

export class CoffeeMailNodeAdapter implements ICoffeeMailSdkAdapter {
  private createClient(context: RequestExecutionContext): CoffeeMail {
    if (!context.apiKey) {
      throw new Error(
        "Chave de API não informada. Defina a API Key no cabeçalho do Workbench para executar operações no SDK.",
      );
    }
    return new CoffeeMail(context.apiKey, {
      locale: "pt-BR",
    });
  }

  public getRunnerInfo(): RunnerInfoDTO {
    return {
      language: "node",
      runtime: process.version,
      sdkVersion: COFFEEMAIL_VERSION,
      status: "online",
    };
  }

  public async introspectKey(
    context: RequestExecutionContext,
  ): Promise<IntrospectKeyResponseDTO> {
    if (!context.apiKey) {
      return {
        valid: false,
        environment: "sandbox",
        permissions: [],
        keyPreview: "",
      };
    }
    const client = this.createClient(context);
    const introspection = await client.introspect();

    if (introspection.error || !introspection.data) {
      return {
        valid: false,
        environment: "sandbox",
        permissions: [],
        keyPreview: context.apiKey ? `${context.apiKey.slice(0, 8)}...` : "",
      };
    }

    const environment: "live" | "test" | "sandbox" = context.apiKey.startsWith(
      "cm_live_",
    )
      ? "live"
      : "test";

    return {
      valid: true,
      environment,
      permissions: introspection.data.scopes,
      keyPreview: `${context.apiKey.slice(0, 8)}...`,
    };
  }

  public async sendEmail(
    context: RequestExecutionContext,
    payload: SendEmailRequestDTO,
  ): Promise<SendEmailResponseDTO> {
    const client = this.createClient(context);
    const targetRecipient = Array.isArray(payload.to)
      ? payload.to[0] ?? ""
      : payload.to;

    const result = await client.emails.send({
      from: payload.from,
      to: targetRecipient,
      subject: payload.subject,
      html: payload.html,
      text: payload.text,
      replyTo: payload.replyTo,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      status: result.data.status,
      createdAt: result.data.queuedAt,
    };
  }

  public async listEmails(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<PaginatedResultDTO<EmailDetailDTO>> {
    const client = this.createClient(context);
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const result = await client.emails.list({
      limit,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const items: readonly EmailDetailDTO[] = (result.data.emails ?? []).map(
      (email) => ({
        id: email.id,
        from: email.from,
        to: email.to,
        subject: email.subject ?? "",
        status: email.status,
        createdAt: email.createdAt,
      }),
    );

    return {
      items,
      total: items.length,
      page,
      limit,
      hasMore: Boolean(result.data.nextCursor),
    };
  }

  public async listDomains(
    context: RequestExecutionContext,
  ): Promise<readonly DomainRecordDTO[]> {
    const client = this.createClient(context);
    const result = await client.domains.list();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data.domains ?? []).map((domain) => ({
      id: domain.id,
      name: domain.name,
      status: domain.status,
      dkimSelector: domain.dkimSelector,
      createdAt: domain.createdAt,
    }));
  }

  public async createDomain(
    context: RequestExecutionContext,
    payload: CreateDomainRequestDTO,
  ): Promise<DomainRecordDTO> {
    const client = this.createClient(context);
    const result = await client.domains.create({ name: payload.name });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      name: result.data.name,
      status: result.data.status,
      createdAt: new Date().toISOString(),
    };
  }

  public async verifyDomain(
    context: RequestExecutionContext,
    domainId: string,
  ): Promise<Record<string, unknown>> {
    const client = this.createClient(context);
    const result = await client.domains.verify(domainId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data as unknown as Record<string, unknown>) ?? {};
  }

  public async getDomainHealth(
    context: RequestExecutionContext,
    domainId: string,
  ): Promise<Record<string, unknown>> {
    const client = this.createClient(context);
    const result = await client.domains.getHealth(domainId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data as unknown as Record<string, unknown>) ?? {};
  }

  public async listTemplates(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<PaginatedResultDTO<TemplateRecordDTO>> {
    const client = this.createClient(context);
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const result = await client.templates.list();

    if (result.error) {
      throw new Error(result.error.message);
    }

    const items: readonly TemplateRecordDTO[] = (result.data.data ?? []).map(
      (template) => ({
        id: template.id,
        name: template.name,
        subject: template.subject,
        format: template.format,
        createdAt: template.createdAt,
      }),
    );

    return {
      items,
      total: items.length,
      page,
      limit,
      hasMore: false,
    };
  }

  public async createTemplate(
    context: RequestExecutionContext,
    payload: CreateTemplateRequestDTO,
  ): Promise<TemplateRecordDTO> {
    const client = this.createClient(context);
    const result = await client.templates.create({
      name: payload.name,
      subject: payload.subject,
      html: payload.html,
      format: payload.format,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      name: result.data.name,
      subject: result.data.subject,
      format: result.data.format,
      createdAt: result.data.createdAt,
    };
  }

  public async previewTemplate(
    context: RequestExecutionContext,
    templateId: string,
  ): Promise<Record<string, unknown>> {
    const client = this.createClient(context);
    const templateResult = await client.templates.get(templateId);

    if (templateResult.error) {
      throw new Error(templateResult.error.message);
    }

    const previewResult = await client.templates.preview({
      html: templateResult.data.html,
      format: templateResult.data.format,
    });

    if (previewResult.error) {
      throw new Error(previewResult.error.message);
    }

    return (previewResult.data as unknown as Record<string, unknown>) ?? {};
  }

  public async listAudiences(
    context: RequestExecutionContext,
  ): Promise<readonly AudienceRecordDTO[]> {
    const client = this.createClient(context);
    const result = await client.audiences.list();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data.audiences ?? []).map((aud) => ({
      id: aud.id,
      name: aud.name,
      totalContacts: aud.contactsCount,
      createdAt: aud.createdAt,
    }));
  }

  public async createAudience(
    context: RequestExecutionContext,
    payload: CreateAudienceRequestDTO,
  ): Promise<AudienceRecordDTO> {
    const client = this.createClient(context);
    const result = await client.audiences.create({
      name: payload.name,
      description: payload.description,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      name: result.data.name,
      totalContacts: 0,
      createdAt: result.data.createdAt,
    };
  }

  public async listContacts(
    context: RequestExecutionContext,
    audienceId: string,
    params: PaginationParamsDTO,
  ): Promise<PaginatedResultDTO<ContactRecordDTO>> {
    const client = this.createClient(context);
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const result = await client.audiences.contacts.list(audienceId, {
      limit,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const items: readonly ContactRecordDTO[] = (
      result.data.contacts ?? []
    ).map((contact) => ({
      id: contact.id,
      email: contact.email,
      firstName: contact.firstName ?? undefined,
      lastName: contact.lastName ?? undefined,
      createdAt: contact.createdAt,
    }));

    return {
      items,
      total: result.data.total ?? items.length,
      page,
      limit,
      hasMore: false,
    };
  }

  public async createContact(
    context: RequestExecutionContext,
    audienceId: string,
    payload: CreateContactRequestDTO,
  ): Promise<ContactRecordDTO> {
    const client = this.createClient(context);
    const result = await client.audiences.contacts.create(audienceId, {
      email: payload.email,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      email: result.data.email,
      firstName: result.data.firstName ?? undefined,
      lastName: result.data.lastName ?? undefined,
      createdAt: result.data.createdAt,
    };
  }

  public async listSuppressions(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<PaginatedResultDTO<SuppressionRecordDTO>> {
    const client = this.createClient(context);
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;

    const result = await client.suppressions.list({ limit });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const items: readonly SuppressionRecordDTO[] = (
      result.data.suppressions ?? []
    ).map((sup) => ({
      id: sup.id,
      email: sup.email,
      reason: sup.reason,
      createdAt: sup.createdAt,
    }));

    return {
      items,
      total: items.length,
      page,
      limit,
      hasMore: Boolean(result.data.nextCursor),
    };
  }

  public async createSuppression(
    context: RequestExecutionContext,
    payload: CreateSuppressionRequestDTO,
  ): Promise<SuppressionRecordDTO> {
    const client = this.createClient(context);
    const result = await client.suppressions.create({
      email: payload.email,
      reason: payload.reason,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      email: result.data.email,
      reason: result.data.reason,
      createdAt: result.data.createdAt,
    };
  }

  public async deleteSuppression(
    context: RequestExecutionContext,
    email: string,
  ): Promise<boolean> {
    const client = this.createClient(context);
    const result = await client.suppressions.delete(email);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return true;
  }

  public async listWebhooks(
    context: RequestExecutionContext,
  ): Promise<readonly WebhookRecordDTO[]> {
    const client = this.createClient(context);
    const result = await client.webhooks.list();

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data.webhooks ?? []).map((wh) => ({
      id: wh.id,
      url: wh.url,
      events: wh.events as readonly string[],
      status: wh.status === "active" ? "active" : "inactive",
      createdAt: wh.createdAt,
    }));
  }

  public async createWebhook(
    context: RequestExecutionContext,
    payload: CreateWebhookRequestDTO,
  ): Promise<WebhookRecordDTO> {
    const client = this.createClient(context);
    const result = await client.webhooks.create({
      url: payload.url,
      events: payload.events as never,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    return {
      id: result.data.id,
      url: result.data.url,
      events: result.data.events as readonly string[],
      status: "active",
      createdAt: result.data.createdAt,
    };
  }

  public async testWebhook(
    context: RequestExecutionContext,
    webhookId: string,
  ): Promise<Record<string, unknown>> {
    const client = this.createClient(context);
    const result = await client.webhooks.test(webhookId);

    if (result.error) {
      throw new Error(result.error.message);
    }

    return (result.data as unknown as Record<string, unknown>) ?? {};
  }

  public async getStats(
    context: RequestExecutionContext,
    query: StatsQueryDTO,
  ): Promise<StatsRecordDTO> {
    const client = this.createClient(context);
    const result = await client.stats.get({
      startDate: query.startDate,
      endDate: query.endDate,
      period: query.period,
    });

    if (result.error) {
      throw new Error(result.error.message);
    }

    const data = result.data;
    const totalSent = data.totalSent ?? 0;
    const totalDelivered = data.totalDelivered ?? 0;
    const totalBounced = data.totalBounced ?? 0;
    const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;

    return {
      totalSent,
      totalDelivered,
      totalBounced,
      deliveryRate: Number(deliveryRate.toFixed(2)),
    };
  }
}

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
  StandardApiResponse,
  StatsQueryDTO,
  StatsRecordDTO,
  SuppressionRecordDTO,
  TemplateRecordDTO,
  WebhookRecordDTO,
} from "@coffeemail/workbench-contracts";
import type { ICoffeeMailSdkAdapter } from "../adapters/coffee-mail-adapter.interface.js";
import type { RequestExecutionContext } from "../types/context.js";

export class CoffeeMailRunnerService {
  constructor(private readonly adapter: ICoffeeMailSdkAdapter) {}

  public getRunnerInfo(): RunnerInfoDTO {
    return this.adapter.getRunnerInfo();
  }

  private async executeWithMetrics<T>(
    operation: () => Promise<T>,
  ): Promise<StandardApiResponse<T>> {
    const startTime = performance.now();
    const runner = this.adapter.getRunnerInfo();

    try {
      const result = await operation();
      const executionTimeMs = Math.round(performance.now() - startTime);

      return {
        success: true,
        runner,
        executionTimeMs,
        data: result,
        error: null,
      };
    } catch (err) {
      const executionTimeMs = Math.round(performance.now() - startTime);
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido na execução";

      return {
        success: false,
        runner,
        executionTimeMs,
        data: null,
        error: {
          code: "RUNNER_EXECUTION_ERROR",
          message: errorMessage,
          status: 500,
          details: null,
        },
      };
    }
  }

  public async introspect(
    context: RequestExecutionContext,
  ): Promise<StandardApiResponse<IntrospectKeyResponseDTO>> {
    return this.executeWithMetrics(() => this.adapter.introspectKey(context));
  }

  public async sendEmail(
    context: RequestExecutionContext,
    payload: SendEmailRequestDTO,
  ): Promise<StandardApiResponse<SendEmailResponseDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.sendEmail(context, payload),
    );
  }

  public async listEmails(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<StandardApiResponse<PaginatedResultDTO<EmailDetailDTO>>> {
    return this.executeWithMetrics(() =>
      this.adapter.listEmails(context, params),
    );
  }

  public async listDomains(
    context: RequestExecutionContext,
  ): Promise<StandardApiResponse<readonly DomainRecordDTO[]>> {
    return this.executeWithMetrics(() => this.adapter.listDomains(context));
  }

  public async createDomain(
    context: RequestExecutionContext,
    payload: CreateDomainRequestDTO,
  ): Promise<StandardApiResponse<DomainRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createDomain(context, payload),
    );
  }

  public async verifyDomain(
    context: RequestExecutionContext,
    domainId: string,
  ): Promise<StandardApiResponse<Record<string, unknown>>> {
    return this.executeWithMetrics(() =>
      this.adapter.verifyDomain(context, domainId),
    );
  }

  public async getDomainHealth(
    context: RequestExecutionContext,
    domainId: string,
  ): Promise<StandardApiResponse<Record<string, unknown>>> {
    return this.executeWithMetrics(() =>
      this.adapter.getDomainHealth(context, domainId),
    );
  }

  public async listTemplates(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<StandardApiResponse<PaginatedResultDTO<TemplateRecordDTO>>> {
    return this.executeWithMetrics(() =>
      this.adapter.listTemplates(context, params),
    );
  }

  public async createTemplate(
    context: RequestExecutionContext,
    payload: CreateTemplateRequestDTO,
  ): Promise<StandardApiResponse<TemplateRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createTemplate(context, payload),
    );
  }

  public async previewTemplate(
    context: RequestExecutionContext,
    templateId: string,
  ): Promise<StandardApiResponse<Record<string, unknown>>> {
    return this.executeWithMetrics(() =>
      this.adapter.previewTemplate(context, templateId),
    );
  }

  public async listAudiences(
    context: RequestExecutionContext,
  ): Promise<StandardApiResponse<readonly AudienceRecordDTO[]>> {
    return this.executeWithMetrics(() => this.adapter.listAudiences(context));
  }

  public async createAudience(
    context: RequestExecutionContext,
    payload: CreateAudienceRequestDTO,
  ): Promise<StandardApiResponse<AudienceRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createAudience(context, payload),
    );
  }

  public async listContacts(
    context: RequestExecutionContext,
    audienceId: string,
    params: PaginationParamsDTO,
  ): Promise<StandardApiResponse<PaginatedResultDTO<ContactRecordDTO>>> {
    return this.executeWithMetrics(() =>
      this.adapter.listContacts(context, audienceId, params),
    );
  }

  public async createContact(
    context: RequestExecutionContext,
    audienceId: string,
    payload: CreateContactRequestDTO,
  ): Promise<StandardApiResponse<ContactRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createContact(context, audienceId, payload),
    );
  }

  public async listSuppressions(
    context: RequestExecutionContext,
    params: PaginationParamsDTO,
  ): Promise<StandardApiResponse<PaginatedResultDTO<SuppressionRecordDTO>>> {
    return this.executeWithMetrics(() =>
      this.adapter.listSuppressions(context, params),
    );
  }

  public async createSuppression(
    context: RequestExecutionContext,
    payload: CreateSuppressionRequestDTO,
  ): Promise<StandardApiResponse<SuppressionRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createSuppression(context, payload),
    );
  }

  public async deleteSuppression(
    context: RequestExecutionContext,
    email: string,
  ): Promise<StandardApiResponse<boolean>> {
    return this.executeWithMetrics(() =>
      this.adapter.deleteSuppression(context, email),
    );
  }

  public async listWebhooks(
    context: RequestExecutionContext,
  ): Promise<StandardApiResponse<readonly WebhookRecordDTO[]>> {
    return this.executeWithMetrics(() => this.adapter.listWebhooks(context));
  }

  public async createWebhook(
    context: RequestExecutionContext,
    payload: CreateWebhookRequestDTO,
  ): Promise<StandardApiResponse<WebhookRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.createWebhook(context, payload),
    );
  }

  public async testWebhook(
    context: RequestExecutionContext,
    webhookId: string,
  ): Promise<StandardApiResponse<Record<string, unknown>>> {
    return this.executeWithMetrics(() =>
      this.adapter.testWebhook(context, webhookId),
    );
  }

  public async getStats(
    context: RequestExecutionContext,
    query: StatsQueryDTO,
  ): Promise<StandardApiResponse<StatsRecordDTO>> {
    return this.executeWithMetrics(() =>
      this.adapter.getStats(context, query),
    );
  }
}

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
import type { RequestExecutionContext } from "../types/context.js";

export interface ICoffeeMailSdkAdapter {
  getRunnerInfo(): RunnerInfoDTO;
  introspectKey(context: RequestExecutionContext): Promise<IntrospectKeyResponseDTO>;
  sendEmail(context: RequestExecutionContext, payload: SendEmailRequestDTO): Promise<SendEmailResponseDTO>;
  listEmails(context: RequestExecutionContext, params: PaginationParamsDTO): Promise<PaginatedResultDTO<EmailDetailDTO>>;
  listDomains(context: RequestExecutionContext): Promise<readonly DomainRecordDTO[]>;
  createDomain(context: RequestExecutionContext, payload: CreateDomainRequestDTO): Promise<DomainRecordDTO>;
  verifyDomain(context: RequestExecutionContext, domainId: string): Promise<Record<string, unknown>>;
  getDomainHealth(context: RequestExecutionContext, domainId: string): Promise<Record<string, unknown>>;
  listTemplates(context: RequestExecutionContext, params: PaginationParamsDTO): Promise<PaginatedResultDTO<TemplateRecordDTO>>;
  createTemplate(context: RequestExecutionContext, payload: CreateTemplateRequestDTO): Promise<TemplateRecordDTO>;
  previewTemplate(context: RequestExecutionContext, templateId: string): Promise<Record<string, unknown>>;
  listAudiences(context: RequestExecutionContext): Promise<readonly AudienceRecordDTO[]>;
  createAudience(context: RequestExecutionContext, payload: CreateAudienceRequestDTO): Promise<AudienceRecordDTO>;
  listContacts(context: RequestExecutionContext, audienceId: string, params: PaginationParamsDTO): Promise<PaginatedResultDTO<ContactRecordDTO>>;
  createContact(context: RequestExecutionContext, audienceId: string, payload: CreateContactRequestDTO): Promise<ContactRecordDTO>;
  listSuppressions(context: RequestExecutionContext, params: PaginationParamsDTO): Promise<PaginatedResultDTO<SuppressionRecordDTO>>;
  createSuppression(context: RequestExecutionContext, payload: CreateSuppressionRequestDTO): Promise<SuppressionRecordDTO>;
  deleteSuppression(context: RequestExecutionContext, email: string): Promise<boolean>;
  listWebhooks(context: RequestExecutionContext): Promise<readonly WebhookRecordDTO[]>;
  createWebhook(context: RequestExecutionContext, payload: CreateWebhookRequestDTO): Promise<WebhookRecordDTO>;
  testWebhook(context: RequestExecutionContext, webhookId: string): Promise<Record<string, unknown>>;
  getStats(context: RequestExecutionContext, query: StatsQueryDTO): Promise<StatsRecordDTO>;
}

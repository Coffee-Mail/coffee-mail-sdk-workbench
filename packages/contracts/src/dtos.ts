export type RunnerLanguage = "node" | "python" | "go" | "java";

export type RunnerStatus = "online" | "degraded" | "offline";

export interface RunnerInfoDTO {
  readonly language: RunnerLanguage;
  readonly runtime: string;
  readonly sdkVersion: string;
  readonly status: RunnerStatus;
}

export interface RunnerErrorDetailDTO {
  readonly code: string;
  readonly message: string;
  readonly status: number;
  readonly details?: Record<string, unknown> | null;
}

export interface StandardApiResponse<T> {
  readonly success: boolean;
  readonly runner: RunnerInfoDTO;
  readonly executionTimeMs: number;
  readonly data: T | null;
  readonly error: RunnerErrorDetailDTO | null;
}

export interface PaginationParamsDTO {
  readonly page?: number;
  readonly limit?: number;
}

export interface PaginatedResultDTO<T> {
  readonly items: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly hasMore: boolean;
}

export interface IntrospectKeyResponseDTO {
  readonly valid: boolean;
  readonly environment: "live" | "test" | "sandbox";
  readonly permissions: readonly string[];
  readonly keyPreview: string;
}

export interface SendEmailRequestDTO {
  readonly from: string;
  readonly to: string | readonly string[];
  readonly subject: string;
  readonly html?: string;
  readonly text?: string;
  readonly replyTo?: string;
  readonly tags?: readonly { readonly name: string; readonly value: string }[];
}

export interface SendEmailResponseDTO {
  readonly id: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface EmailDetailDTO {
  readonly id: string;
  readonly from: string;
  readonly to: readonly string[];
  readonly subject: string;
  readonly status: string;
  readonly createdAt: string;
}

export interface CreateDomainRequestDTO {
  readonly name: string;
}

export interface DomainRecordDTO {
  readonly id: string;
  readonly name: string;
  readonly status: "pending" | "verified" | "failed";
  readonly dkimSelector?: string;
  readonly createdAt?: string;
}

export interface CreateTemplateRequestDTO {
  readonly name: string;
  readonly subject?: string;
  readonly html: string;
  readonly format?: "html" | "react";
}

export interface TemplateRecordDTO {
  readonly id: string;
  readonly name: string;
  readonly subject: string | null;
  readonly format: string;
  readonly createdAt: string;
}

export interface CreateAudienceRequestDTO {
  readonly name: string;
  readonly description?: string;
}

export interface AudienceRecordDTO {
  readonly id: string;
  readonly name: string;
  readonly totalContacts: number;
  readonly createdAt: string;
}

export interface CreateContactRequestDTO {
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
}

export interface ContactRecordDTO {
  readonly id: string;
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
  readonly createdAt: string;
}

export interface CreateSuppressionRequestDTO {
  readonly email: string;
  readonly reason: "manual" | "bounce" | "complaint";
}

export interface SuppressionRecordDTO {
  readonly id: string;
  readonly email: string;
  readonly reason: string;
  readonly createdAt: string;
}

export interface CreateWebhookRequestDTO {
  readonly url: string;
  readonly events: readonly string[];
}

export interface WebhookRecordDTO {
  readonly id: string;
  readonly url: string;
  readonly events: readonly string[];
  readonly status: "active" | "inactive";
  readonly createdAt: string;
}

export interface StatsQueryDTO {
  readonly startDate?: string;
  readonly endDate?: string;
  readonly period?: "last7d" | "last30d" | "last90d";
}

export interface StatsRecordDTO {
  readonly totalSent: number;
  readonly totalDelivered: number;
  readonly totalBounced: number;
  readonly deliveryRate: number;
}

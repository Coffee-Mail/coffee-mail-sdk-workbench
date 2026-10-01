import { useCallback, useState } from "react";
import type { StandardApiResponse } from "@coffeemail/workbench-contracts";
import { RUNNER_HEADERS } from "@coffeemail/workbench-contracts";

export interface RequestOptions {
  readonly method?: "GET" | "POST" | "PUT" | "DELETE";
  readonly body?: unknown;
}

export interface UseRunnerApiResult<T> {
  readonly execute: (endpoint: string, options?: RequestOptions) => Promise<StandardApiResponse<T> | null>;
  readonly isLoading: boolean;
  readonly lastResponse: StandardApiResponse<T> | null;
  readonly lastError: string | null;
}

export function useRunnerApi<T>(
  runnerBaseUrl: string,
  apiKey: string,
): UseRunnerApiResult<T> {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [lastResponse, setLastResponse] = useState<StandardApiResponse<T> | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  const execute = useCallback(
    async (
      endpoint: string,
      options: RequestOptions = {},
    ): Promise<StandardApiResponse<T> | null> => {
      setIsLoading(true);
      setLastError(null);

      const targetUrl = `${runnerBaseUrl}${endpoint}`;
      const method = options.method ?? "GET";
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      if (apiKey.length > 0) {
        headers[RUNNER_HEADERS.API_KEY] = apiKey;
      }

      try {
        const response = await fetch(targetUrl, {
          method,
          headers,
          body: options.body ? JSON.stringify(options.body) : undefined,
        });

        const data: StandardApiResponse<T> = await response.json();
        setLastResponse(data);

        if (!data.success && data.error) {
          setLastError(data.error.message);
        }

        return data;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Falha de conexão com o SDK Runner selecionado.";
        setLastError(message);

        const fallbackResponse: StandardApiResponse<T> = {
          success: false,
          runner: {
            language: "node",
            runtime: "desconhecido",
            sdkVersion: "desconhecido",
            status: "offline",
          },
          executionTimeMs: 0,
          data: null,
          error: {
            code: "NETWORK_ERROR",
            message,
            status: 0,
            details: null,
          },
        };

        setLastResponse(fallbackResponse);
        return fallbackResponse;
      } finally {
        setIsLoading(false);
      }
    },
    [runnerBaseUrl, apiKey],
  );

  return {
    execute,
    isLoading,
    lastResponse,
    lastError,
  };
}

import type React from "react";
import type { StandardApiResponse } from "@coffeemail/workbench-contracts";
import { UI_STRINGS } from "../constants/ui-strings.js";

export interface ResponseViewerProps {
  readonly response: StandardApiResponse<unknown> | null;
  readonly isLoading: boolean;
}

export function ResponseViewer({
  response,
  isLoading,
}: ResponseViewerProps): React.ReactElement {
  if (isLoading) {
    return (
      <div className="card">
        <h2>{UI_STRINGS.COMMON.RESPONSE_TITLE}</h2>
        <div style={{ color: "var(--accent)", fontSize: "0.9rem" }}>
          {UI_STRINGS.COMMON.LOADING}
        </div>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="card">
        <h2>{UI_STRINGS.COMMON.RESPONSE_TITLE}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Nenhuma requisição realizada ainda nesta tela.
        </p>
      </div>
    );
  }

  const isSuccess = response.success;
  const badgeClass = isSuccess ? "status-badge online" : "status-badge offline";
  const badgeText = isSuccess
    ? UI_STRINGS.COMMON.SUCCESS_BADGE
    : UI_STRINGS.COMMON.ERROR_BADGE;

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
        }}
      >
        <h2>{UI_STRINGS.COMMON.RESPONSE_TITLE}</h2>
        <span className={badgeClass}>{badgeText}</span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          fontSize: "0.8rem",
          color: "var(--text-muted)",
          flexWrap: "wrap",
        }}
      >
        <span>
          <strong>{UI_STRINGS.COMMON.RUNNER_BADGE}</strong>{" "}
          {response.runner.language.toUpperCase()} ({response.runner.sdkVersion})
        </span>
        <span>
          <strong>{UI_STRINGS.COMMON.EXECUTION_TIME}</strong>{" "}
          {response.executionTimeMs}ms
        </span>
      </div>

      <pre className="response-viewer">
        <code>{JSON.stringify(response, null, 2)}</code>
      </pre>
    </div>
  );
}

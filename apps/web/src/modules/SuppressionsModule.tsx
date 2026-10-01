import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  CreateSuppressionRequestDTO,
  PaginatedResultDTO,
  SuppressionRecordDTO,
} from "@coffeemail/workbench-contracts";

export interface SuppressionsModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const SuppressionsModule: React.FC<SuppressionsModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [email, setEmail] = useState<string>("optout@cliente.com.br");
  const [reason, setReason] = useState<"manual" | "bounce" | "complaint">("manual");

  const listApi = useRunnerApi<PaginatedResultDTO<SuppressionRecordDTO>>(runnerUrl, apiKey);
  const createApi = useRunnerApi<SuppressionRecordDTO>(runnerUrl, apiKey);
  const deleteApi = useRunnerApi<boolean>(runnerUrl, apiKey);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateSuppressionRequestDTO = { email, reason };
    await createApi.execute(RUNNER_ENDPOINTS.SUPPRESSIONS.CREATE, {
      method: "POST",
      body: payload,
    });
    void listApi.execute(`${RUNNER_ENDPOINTS.SUPPRESSIONS.LIST}?page=1&limit=5`);
  };

  const handleList = async () => {
    await listApi.execute(`${RUNNER_ENDPOINTS.SUPPRESSIONS.LIST}?page=1&limit=5`);
  };

  const handleDelete = async (targetEmail: string) => {
    await deleteApi.execute(RUNNER_ENDPOINTS.SUPPRESSIONS.DELETE(targetEmail), {
      method: "DELETE",
    });
    void listApi.execute(`${RUNNER_ENDPOINTS.SUPPRESSIONS.LIST}?page=1&limit=5`);
  };

  const isAnyLoading = listApi.isLoading || createApi.isLoading || deleteApi.isLoading;

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.SUPPRESSIONS.TITLE}</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="sup-email">{UI_STRINGS.SUPPRESSIONS.EMAIL_LABEL}</label>
              <input
                id="sup-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="sup-reason">{UI_STRINGS.SUPPRESSIONS.REASON_LABEL}</label>
              <select
                id="sup-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value as "manual" | "bounce" | "complaint")}
              >
                <option value="manual">{UI_STRINGS.SUPPRESSIONS.REASONS.MANUAL}</option>
                <option value="bounce">{UI_STRINGS.SUPPRESSIONS.REASONS.BOUNCE}</option>
                <option value="complaint">{UI_STRINGS.SUPPRESSIONS.REASONS.COMPLAINT}</option>
              </select>
            </div>

            <button type="submit" disabled={createApi.isLoading}>
              {createApi.isLoading ? UI_STRINGS.COMMON.LOADING : "Adicionar à Supressão via SDK"}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.SUPPRESSIONS.LIST_TITLE}</h2>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleList}
              disabled={listApi.isLoading}
            >
              {UI_STRINGS.COMMON.REFRESH}
            </button>
          </div>

          {listApi.isLoading ? (
            <SkeletonLoader rows={2} />
          ) : listApi.lastResponse?.data?.items && listApi.lastResponse.data.items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>E-mail</th>
                  <th>Motivo</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {listApi.lastResponse.data.items.map((sup) => (
                  <tr key={sup.id}>
                    <td>{sup.email}</td>
                    <td>{sup.reason}</td>
                    <td>
                      <button
                        type="button"
                        className="danger-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleDelete(sup.email)}
                      >
                        {UI_STRINGS.SUPPRESSIONS.DELETE_BUTTON}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
              {UI_STRINGS.COMMON.EMPTY_LIST}
            </p>
          )}
        </div>
      </div>

      <ResponseViewer
        response={deleteApi.lastResponse ?? createApi.lastResponse ?? listApi.lastResponse}
        isLoading={isAnyLoading}
      />
    </div>
  );
};

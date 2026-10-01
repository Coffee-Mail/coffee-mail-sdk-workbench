import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  CreateDomainRequestDTO,
  DomainRecordDTO,
} from "@coffeemail/workbench-contracts";

export interface DomainsModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const DomainsModule: React.FC<DomainsModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [name, setName] = useState<string>("teste.meudominio.com.br");

  const listApi = useRunnerApi<readonly DomainRecordDTO[]>(runnerUrl, apiKey);
  const createApi = useRunnerApi<DomainRecordDTO>(runnerUrl, apiKey);
  const actionApi = useRunnerApi<Record<string, unknown>>(runnerUrl, apiKey);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateDomainRequestDTO = { name };
    await createApi.execute(RUNNER_ENDPOINTS.DOMAINS.CREATE, {
      method: "POST",
      body: payload,
    });
    void listApi.execute(RUNNER_ENDPOINTS.DOMAINS.LIST);
  };

  const handleList = async () => {
    await listApi.execute(RUNNER_ENDPOINTS.DOMAINS.LIST);
  };

  const handleVerify = async (domainId: string) => {
    await actionApi.execute(RUNNER_ENDPOINTS.DOMAINS.VERIFY(domainId), {
      method: "POST",
    });
  };

  const handleHealth = async (domainId: string) => {
    await actionApi.execute(RUNNER_ENDPOINTS.DOMAINS.HEALTH(domainId));
  };

  const isAnyLoading = listApi.isLoading || createApi.isLoading || actionApi.isLoading;

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.DOMAINS.TITLE}</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="domain-name">{UI_STRINGS.DOMAINS.NAME_LABEL}</label>
              <input
                id="domain-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={createApi.isLoading}>
              {createApi.isLoading ? UI_STRINGS.COMMON.LOADING : "Cadastrar Domínio via SDK"}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.DOMAINS.LIST_TITLE}</h2>
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
            <SkeletonLoader rows={3} />
          ) : listApi.lastResponse?.data && listApi.lastResponse.data.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Domínio</th>
                  <th>Status</th>
                  <th>DKIM</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listApi.lastResponse.data.map((domain) => (
                  <tr key={domain.id}>
                    <td>{domain.name}</td>
                    <td>{domain.status}</td>
                    <td>{domain.dkimSelector ?? "-"}</td>
                    <td style={{ display: "flex", gap: "0.4rem" }}>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleVerify(domain.id)}
                      >
                        {UI_STRINGS.DOMAINS.VERIFY_BUTTON}
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleHealth(domain.id)}
                      >
                        {UI_STRINGS.DOMAINS.HEALTH_BUTTON}
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
        response={actionApi.lastResponse ?? createApi.lastResponse ?? listApi.lastResponse}
        isLoading={isAnyLoading}
      />
    </div>
  );
};

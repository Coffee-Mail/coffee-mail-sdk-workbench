import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  CreateWebhookRequestDTO,
  WebhookRecordDTO,
} from "@coffeemail/workbench-contracts";

export interface WebhooksModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const WebhooksModule: React.FC<WebhooksModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [url, setUrl] = useState<string>("https://meusite.com.br/api/webhooks/coffeemail");
  const [eventsInput, setEventsInput] = useState<string>("email.delivered, email.bounced");

  const listApi = useRunnerApi<readonly WebhookRecordDTO[]>(runnerUrl, apiKey);
  const createApi = useRunnerApi<WebhookRecordDTO>(runnerUrl, apiKey);
  const testApi = useRunnerApi<Record<string, unknown>>(runnerUrl, apiKey);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const events = eventsInput.split(",").map((item) => item.trim()).filter(Boolean);
    const payload: CreateWebhookRequestDTO = { url, events };

    await createApi.execute(RUNNER_ENDPOINTS.WEBHOOKS.CREATE, {
      method: "POST",
      body: payload,
    });
    void listApi.execute(RUNNER_ENDPOINTS.WEBHOOKS.LIST);
  };

  const handleList = async () => {
    await listApi.execute(RUNNER_ENDPOINTS.WEBHOOKS.LIST);
  };

  const handleTest = async (webhookId: string) => {
    await testApi.execute(RUNNER_ENDPOINTS.WEBHOOKS.TEST(webhookId), {
      method: "POST",
    });
  };

  const isAnyLoading = listApi.isLoading || createApi.isLoading || testApi.isLoading;

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.WEBHOOKS.TITLE}</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="webhook-url">{UI_STRINGS.WEBHOOKS.URL_LABEL}</label>
              <input
                id="webhook-url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="webhook-events">{UI_STRINGS.WEBHOOKS.EVENTS_LABEL}</label>
              <input
                id="webhook-events"
                type="text"
                value={eventsInput}
                onChange={(e) => setEventsInput(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={createApi.isLoading}>
              {createApi.isLoading ? UI_STRINGS.COMMON.LOADING : "Cadastrar Webhook via SDK"}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.WEBHOOKS.LIST_TITLE}</h2>
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
          ) : listApi.lastResponse?.data && listApi.lastResponse.data.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>URL</th>
                  <th>Eventos</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {listApi.lastResponse.data.map((wh) => (
                  <tr key={wh.id}>
                    <td>{wh.url}</td>
                    <td>{wh.events.join(", ")}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleTest(wh.id)}
                      >
                        {UI_STRINGS.WEBHOOKS.TEST_BUTTON}
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
        response={testApi.lastResponse ?? createApi.lastResponse ?? listApi.lastResponse}
        isLoading={isAnyLoading}
      />
    </div>
  );
};

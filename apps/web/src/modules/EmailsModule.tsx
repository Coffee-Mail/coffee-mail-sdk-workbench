import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  EmailDetailDTO,
  PaginatedResultDTO,
  SendEmailRequestDTO,
  SendEmailResponseDTO,
} from "@coffeemail/workbench-contracts";

export interface EmailsModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const EmailsModule: React.FC<EmailsModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [from, setFrom] = useState<string>("noreply@seudominio.com.br");
  const [to, setTo] = useState<string>("teste@exemplo.com");
  const [subject, setSubject] = useState<string>("Teste de Envio via SDK Workbench");
  const [html, setHtml] = useState<string>("<p>Olá! Este é um e-mail disparado pelo <strong>CoffeeMail SDK</strong>.</p>");

  const sendApi = useRunnerApi<SendEmailResponseDTO>(runnerUrl, apiKey);
  const listApi = useRunnerApi<PaginatedResultDTO<EmailDetailDTO>>(runnerUrl, apiKey);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: SendEmailRequestDTO = {
      from,
      to,
      subject,
      html,
    };
    await sendApi.execute(RUNNER_ENDPOINTS.EMAILS.SEND, {
      method: "POST",
      body: payload,
    });
  };

  const handleList = async () => {
    await listApi.execute(`${RUNNER_ENDPOINTS.EMAILS.LIST}?page=1&limit=5`);
  };

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.EMAILS.TITLE}</h2>
          <form onSubmit={handleSend} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="email-from">{UI_STRINGS.EMAILS.FROM_LABEL}</label>
              <input
                id="email-from"
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="email-to">{UI_STRINGS.EMAILS.TO_LABEL}</label>
              <input
                id="email-to"
                type="text"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="email-subject">{UI_STRINGS.EMAILS.SUBJECT_LABEL}</label>
              <input
                id="email-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="email-html">{UI_STRINGS.EMAILS.HTML_LABEL}</label>
              <textarea
                id="email-html"
                rows={3}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
              />
            </div>

            <button type="submit" disabled={sendApi.isLoading}>
              {sendApi.isLoading ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.COMMON.SUBMIT}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.EMAILS.LIST_TITLE}</h2>
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
          ) : listApi.lastResponse?.data?.items && listApi.lastResponse.data.items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Para</th>
                  <th>Assunto</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {listApi.lastResponse.data.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.id}</td>
                    <td>{item.to.join(", ")}</td>
                    <td>{item.subject}</td>
                    <td>{item.status}</td>
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
        response={sendApi.lastResponse ?? listApi.lastResponse}
        isLoading={sendApi.isLoading || listApi.isLoading}
      />
    </div>
  );
};

import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  CreateTemplateRequestDTO,
  PaginatedResultDTO,
  TemplateRecordDTO,
} from "@coffeemail/workbench-contracts";

export interface TemplatesModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const TemplatesModule: React.FC<TemplatesModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [name, setName] = useState<string>("boas-vindas");
  const [subject, setSubject] = useState<string>("Seja bem-vindo à nossa plataforma!");
  const [html, setHtml] = useState<string>("<h1>Olá, {{name}}!</h1><p>Obrigado por se juntar a nós.</p>");

  const listApi = useRunnerApi<PaginatedResultDTO<TemplateRecordDTO>>(runnerUrl, apiKey);
  const createApi = useRunnerApi<TemplateRecordDTO>(runnerUrl, apiKey);
  const previewApi = useRunnerApi<Record<string, unknown>>(runnerUrl, apiKey);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateTemplateRequestDTO = {
      name,
      subject,
      html,
      format: "html",
    };
    await createApi.execute(RUNNER_ENDPOINTS.TEMPLATES.CREATE, {
      method: "POST",
      body: payload,
    });
    void listApi.execute(`${RUNNER_ENDPOINTS.TEMPLATES.LIST}?page=1&limit=5`);
  };

  const handleList = async () => {
    await listApi.execute(`${RUNNER_ENDPOINTS.TEMPLATES.LIST}?page=1&limit=5`);
  };

  const handlePreview = async (templateId: string) => {
    await previewApi.execute(RUNNER_ENDPOINTS.TEMPLATES.PREVIEW(templateId), {
      method: "POST",
    });
  };

  const isAnyLoading = listApi.isLoading || createApi.isLoading || previewApi.isLoading;

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.TEMPLATES.TITLE}</h2>
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="template-name">{UI_STRINGS.TEMPLATES.NAME_LABEL}</label>
              <input
                id="template-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="template-subject">{UI_STRINGS.TEMPLATES.SUBJECT_LABEL}</label>
              <input
                id="template-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="template-html">{UI_STRINGS.TEMPLATES.HTML_LABEL}</label>
              <textarea
                id="template-html"
                rows={3}
                value={html}
                onChange={(e) => setHtml(e.target.value)}
                required
              />
            </div>

            <button type="submit" disabled={createApi.isLoading}>
              {createApi.isLoading ? UI_STRINGS.COMMON.LOADING : "Criar Modelo via SDK"}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.TEMPLATES.LIST_TITLE}</h2>
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
                  <th>Nome</th>
                  <th>Assunto</th>
                  <th>Formato</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {listApi.lastResponse.data.items.map((tpl) => (
                  <tr key={tpl.id}>
                    <td>{tpl.name}</td>
                    <td>{tpl.subject}</td>
                    <td>{tpl.format}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handlePreview(tpl.id)}
                      >
                        {UI_STRINGS.TEMPLATES.PREVIEW_BUTTON}
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
        response={previewApi.lastResponse ?? createApi.lastResponse ?? listApi.lastResponse}
        isLoading={isAnyLoading}
      />
    </div>
  );
};

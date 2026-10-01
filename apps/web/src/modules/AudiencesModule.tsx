import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type {
  AudienceRecordDTO,
  ContactRecordDTO,
  CreateAudienceRequestDTO,
  CreateContactRequestDTO,
  PaginatedResultDTO,
} from "@coffeemail/workbench-contracts";

export interface AudiencesModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const AudiencesModule: React.FC<AudiencesModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [audienceName, setAudienceName] = useState<string>("Clientes VIP");
  const [selectedAudienceId, setSelectedAudienceId] = useState<string>("");
  const [contactEmail, setContactEmail] = useState<string>("cliente.vip@exemplo.com");
  const [contactFirstName, setContactFirstName] = useState<string>("Carlos");

  const listAudiencesApi = useRunnerApi<readonly AudienceRecordDTO[]>(runnerUrl, apiKey);
  const createAudienceApi = useRunnerApi<AudienceRecordDTO>(runnerUrl, apiKey);
  const listContactsApi = useRunnerApi<PaginatedResultDTO<ContactRecordDTO>>(runnerUrl, apiKey);
  const createContactApi = useRunnerApi<ContactRecordDTO>(runnerUrl, apiKey);

  const handleCreateAudience = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: CreateAudienceRequestDTO = { name: audienceName };
    await createAudienceApi.execute(RUNNER_ENDPOINTS.AUDIENCES.CREATE, {
      method: "POST",
      body: payload,
    });
    void listAudiencesApi.execute(RUNNER_ENDPOINTS.AUDIENCES.LIST);
  };

  const handleListAudiences = async () => {
    await listAudiencesApi.execute(RUNNER_ENDPOINTS.AUDIENCES.LIST);
  };

  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudienceId) return;

    const payload: CreateContactRequestDTO = {
      email: contactEmail,
      firstName: contactFirstName,
    };

    await createContactApi.execute(RUNNER_ENDPOINTS.AUDIENCES.CONTACTS(selectedAudienceId), {
      method: "POST",
      body: payload,
    });
    void listContactsApi.execute(`${RUNNER_ENDPOINTS.AUDIENCES.CONTACTS(selectedAudienceId)}?page=1&limit=5`);
  };

  const handleSelectAudience = (id: string) => {
    setSelectedAudienceId(id);
    void listContactsApi.execute(`${RUNNER_ENDPOINTS.AUDIENCES.CONTACTS(id)}?page=1&limit=5`);
  };

  const isAnyLoading =
    listAudiencesApi.isLoading ||
    createAudienceApi.isLoading ||
    listContactsApi.isLoading ||
    createContactApi.isLoading;

  return (
    <div className="module-layout">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
        <div className="card">
          <h2>{UI_STRINGS.AUDIENCES.TITLE}</h2>
          <form onSubmit={handleCreateAudience} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
            <div className="field-group">
              <label htmlFor="aud-name">{UI_STRINGS.AUDIENCES.AUDIENCE_NAME_LABEL}</label>
              <input
                id="aud-name"
                type="text"
                value={audienceName}
                onChange={(e) => setAudienceName(e.target.value)}
                required
              />
            </div>
            <button type="submit" disabled={createAudienceApi.isLoading}>
              {createAudienceApi.isLoading ? UI_STRINGS.COMMON.LOADING : "Criar Audiência via SDK"}
            </button>
          </form>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h2>{UI_STRINGS.AUDIENCES.LIST_TITLE}</h2>
            <button
              type="button"
              className="secondary-btn"
              onClick={handleListAudiences}
              disabled={listAudiencesApi.isLoading}
            >
              {UI_STRINGS.COMMON.REFRESH}
            </button>
          </div>

          {listAudiencesApi.isLoading ? (
            <SkeletonLoader rows={2} />
          ) : listAudiencesApi.lastResponse?.data && listAudiencesApi.lastResponse.data.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Total</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {listAudiencesApi.lastResponse.data.map((aud) => (
                  <tr key={aud.id}>
                    <td>{aud.name}</td>
                    <td>{aud.totalContacts}</td>
                    <td>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: "0.25rem 0.5rem", fontSize: "0.75rem" }}
                        onClick={() => handleSelectAudience(aud.id)}
                      >
                        Ver Contatos
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

        {selectedAudienceId ? (
          <div className="card">
            <h2>{UI_STRINGS.AUDIENCES.CONTACTS_LIST_TITLE} (ID: {selectedAudienceId})</h2>
            <form onSubmit={handleCreateContact} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              <div className="field-group">
                <label htmlFor="contact-email">{UI_STRINGS.AUDIENCES.CONTACT_EMAIL_LABEL}</label>
                <input
                  id="contact-email"
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  required
                />
              </div>

              <div className="field-group">
                <label htmlFor="contact-name">{UI_STRINGS.AUDIENCES.CONTACT_FIRST_NAME_LABEL}</label>
                <input
                  id="contact-name"
                  type="text"
                  value={contactFirstName}
                  onChange={(e) => setContactFirstName(e.target.value)}
                />
              </div>

              <button type="submit" disabled={createContactApi.isLoading}>
                {createContactApi.isLoading ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.AUDIENCES.ADD_CONTACT_BUTTON}
              </button>
            </form>

            <div style={{ marginTop: "1rem" }}>
              {listContactsApi.isLoading ? (
                <SkeletonLoader rows={2} />
              ) : listContactsApi.lastResponse?.data?.items && listContactsApi.lastResponse.data.items.length > 0 ? (
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>E-mail</th>
                      <th>Nome</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listContactsApi.lastResponse.data.items.map((contact) => (
                      <tr key={contact.id}>
                        <td>{contact.email}</td>
                        <td>{contact.firstName ?? "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                  Nenhum contato nesta audiência.
                </p>
              )}
            </div>
          </div>
        ) : null}
      </div>

      <ResponseViewer
        response={
          createContactApi.lastResponse ??
          listContactsApi.lastResponse ??
          createAudienceApi.lastResponse ??
          listAudiencesApi.lastResponse
        }
        isLoading={isAnyLoading}
      />
    </div>
  );
};

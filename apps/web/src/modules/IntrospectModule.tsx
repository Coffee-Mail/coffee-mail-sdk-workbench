import type React from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type { IntrospectKeyResponseDTO } from "@coffeemail/workbench-contracts";

export interface IntrospectModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const IntrospectModule: React.FC<IntrospectModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const { execute, isLoading, lastResponse } = useRunnerApi<IntrospectKeyResponseDTO>(
    runnerUrl,
    apiKey,
  );

  const handleIntrospect = async (e: React.FormEvent) => {
    e.preventDefault();
    await execute(RUNNER_ENDPOINTS.INTROSPECT, { method: "POST" });
  };

  return (
    <div className="module-layout">
      <div className="card">
        <h2>Introspecção de Credenciais do SDK</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Executa a validação formal da chave da API, identificando permissões ativas,
          ambiente (sandbox, live ou test) e estado do cache de autorização do SDK.
        </p>

        <form onSubmit={handleIntrospect} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button type="submit" disabled={isLoading}>
            {isLoading ? "Introspectando via SDK..." : "Executar coffeemail.introspect()"}
          </button>
        </form>

        {isLoading ? (
          <div style={{ marginTop: "1rem" }}>
            <SkeletonLoader rows={2} />
          </div>
        ) : null}
      </div>

      <ResponseViewer response={lastResponse} isLoading={isLoading} />
    </div>
  );
};

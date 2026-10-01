import type React from "react";
import { useState } from "react";
import { useRunnerApi } from "../hooks/useRunnerApi.js";
import { ResponseViewer } from "../components/ResponseViewer.js";
import { SkeletonLoader } from "../components/SkeletonLoader.js";
import { UI_STRINGS } from "../constants/ui-strings.js";
import { RUNNER_ENDPOINTS } from "@coffeemail/workbench-contracts";
import type { StatsRecordDTO } from "@coffeemail/workbench-contracts";

export interface StatsModuleProps {
  readonly runnerUrl: string;
  readonly apiKey: string;
}

export const StatsModule: React.FC<StatsModuleProps> = ({
  runnerUrl,
  apiKey,
}) => {
  const [dateFrom, setDateFrom] = useState<string>("2026-09-01");
  const [dateTo, setDateTo] = useState<string>("2026-10-01");

  const statsApi = useRunnerApi<StatsRecordDTO>(runnerUrl, apiKey);

  const handleFetchStats = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = `?startDate=${encodeURIComponent(dateFrom)}&endDate=${encodeURIComponent(dateTo)}`;
    await statsApi.execute(`${RUNNER_ENDPOINTS.STATS.GET}${query}`);
  };

  return (
    <div className="module-layout">
      <div className="card">
        <h2>{UI_STRINGS.STATS.TITLE}</h2>
        <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          Consulta agregada de envios, entregas confirmadas e taxa de entrega (delivery rate) diretamente via SDK.
        </p>

        <form onSubmit={handleFetchStats} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div className="field-group">
            <label htmlFor="stats-from">{UI_STRINGS.STATS.DATE_FROM_LABEL}</label>
            <input
              id="stats-from"
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>

          <div className="field-group">
            <label htmlFor="stats-to">{UI_STRINGS.STATS.DATE_TO_LABEL}</label>
            <input
              id="stats-to"
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>

          <button type="submit" disabled={statsApi.isLoading}>
            {statsApi.isLoading ? UI_STRINGS.COMMON.LOADING : UI_STRINGS.STATS.CONSULT_BUTTON}
          </button>
        </form>

        {statsApi.isLoading ? (
          <div style={{ marginTop: "1rem" }}>
            <SkeletonLoader rows={2} />
          </div>
        ) : statsApi.lastResponse?.data ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "1rem", marginTop: "1rem" }}>
            <div style={{ background: "var(--bg-primary)", padding: "0.75rem", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total Enviados</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{statsApi.lastResponse.data.totalSent}</p>
            </div>
            <div style={{ background: "var(--bg-primary)", padding: "0.75rem", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total Entregues</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{statsApi.lastResponse.data.totalDelivered}</p>
            </div>
            <div style={{ background: "var(--bg-primary)", padding: "0.75rem", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Total Bounces</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 700 }}>{statsApi.lastResponse.data.totalBounced}</p>
            </div>
            <div style={{ background: "var(--bg-primary)", padding: "0.75rem", borderRadius: "6px" }}>
              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Taxa de Entrega</span>
              <p style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--success)" }}>
                {statsApi.lastResponse.data.deliveryRate}%
              </p>
            </div>
          </div>
        ) : null}
      </div>

      <ResponseViewer response={statsApi.lastResponse} isLoading={statsApi.isLoading} />
    </div>
  );
};

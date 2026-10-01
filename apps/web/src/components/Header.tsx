import type React from "react";
import { DEFAULT_RUNNERS, UI_STRINGS } from "../constants/ui-strings.js";
import type { RunnerInfoDTO } from "@coffeemail/workbench-contracts";

export interface HeaderProps {
  readonly runnerUrl: string;
  readonly onRunnerUrlChange: (url: string) => void;
  readonly apiKey: string;
  readonly onApiKeyChange: (key: string) => void;
  readonly isOnline: boolean;
  readonly isChecking: boolean;
  readonly runnerInfo: RunnerInfoDTO | null;
  readonly onCheckConnection: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  runnerUrl,
  onRunnerUrlChange,
  apiKey,
  onApiKeyChange,
  isOnline,
  isChecking,
  runnerInfo,
  onCheckConnection,
}) => {
  return (
    <header className="header-panel">
      <div className="header-title-section">
        <h1>{UI_STRINGS.APP_TITLE}</h1>
        <p>{UI_STRINGS.APP_SUBTITLE}</p>
      </div>

      <div className="header-controls">
        <div className="field-group">
          <label htmlFor="runner-select">
            {UI_STRINGS.HEADER.RUNNER_SELECT_LABEL}
          </label>
          <select
            id="runner-select"
            value={runnerUrl}
            onChange={(e) => onRunnerUrlChange(e.target.value)}
          >
            {DEFAULT_RUNNERS.map((runner) => (
              <option key={runner.id} value={runner.url}>
                {runner.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="api-key-input">
            {UI_STRINGS.HEADER.API_KEY_LABEL}
          </label>
          <input
            id="api-key-input"
            type="password"
            placeholder={UI_STRINGS.HEADER.API_KEY_PLACEHOLDER}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button
            type="button"
            className="secondary-btn"
            onClick={onCheckConnection}
            disabled={isChecking}
          >
            {isChecking
              ? "Verificando..."
              : UI_STRINGS.HEADER.CHECK_CONNECTION_BUTTON}
          </button>
          <span
            className={
              isOnline ? "status-badge online" : "status-badge offline"
            }
          >
            {isOnline
              ? `${UI_STRINGS.HEADER.STATUS_ONLINE} (${runnerInfo?.language ?? "Node"} / SDK ${runnerInfo?.sdkVersion ?? ""})`
              : UI_STRINGS.HEADER.STATUS_OFFLINE}
          </span>
        </div>
      </div>
    </header>
  );
};

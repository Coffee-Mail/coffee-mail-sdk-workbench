import type React from "react";
import { useCallback, useState } from "react";
import { Header } from "./components/Header.js";
import { DEFAULT_RUNNERS, STORAGE_KEYS, UI_STRINGS } from "./constants/ui-strings.js";
import { useRunnerStatus } from "./hooks/useRunnerStatus.js";
import { IntrospectModule } from "./modules/IntrospectModule.js";
import { EmailsModule } from "./modules/EmailsModule.js";
import { DomainsModule } from "./modules/DomainsModule.js";
import { TemplatesModule } from "./modules/TemplatesModule.js";
import { AudiencesModule } from "./modules/AudiencesModule.js";
import { SuppressionsModule } from "./modules/SuppressionsModule.js";
import { WebhooksModule } from "./modules/WebhooksModule.js";
import { StatsModule } from "./modules/StatsModule.js";

type ActiveTab =
  | "introspect"
  | "emails"
  | "domains"
  | "templates"
  | "audiences"
  | "suppressions"
  | "webhooks"
  | "stats";

export const App: React.FC = () => {
  const [runnerUrl, setRunnerUrl] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedRunner = localStorage.getItem(STORAGE_KEYS.RUNNER_URL);
      if (savedRunner) {
        return savedRunner;
      }
    }
    return DEFAULT_RUNNERS[0].url;
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const savedKey = localStorage.getItem(STORAGE_KEYS.API_KEY);
      if (savedKey) {
        return savedKey;
      }
    }
    return "";
  });

  const [activeTab, setActiveTab] = useState<ActiveTab>("introspect");

  const handleApiKeyChange = useCallback((newKey: string) => {
    setApiKey(newKey);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.API_KEY, newKey);
    }
  }, []);

  const handleRunnerUrlChange = useCallback((newUrl: string) => {
    setRunnerUrl(newUrl);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEYS.RUNNER_URL, newUrl);
    }
  }, []);

  const { runnerInfo, isOnline, isChecking, checkConnection } = useRunnerStatus(runnerUrl);

  const renderActiveModule = () => {
    switch (activeTab) {
      case "introspect":
        return <IntrospectModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "emails":
        return <EmailsModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "domains":
        return <DomainsModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "templates":
        return <TemplatesModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "audiences":
        return <AudiencesModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "suppressions":
        return <SuppressionsModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "webhooks":
        return <WebhooksModule runnerUrl={runnerUrl} apiKey={apiKey} />;
      case "stats":
        return <StatsModule runnerUrl={runnerUrl} apiKey={apiKey} />;
    }
  };

  return (
    <div className="container">
      <Header
        runnerUrl={runnerUrl}
        onRunnerUrlChange={handleRunnerUrlChange}
        apiKey={apiKey}
        onApiKeyChange={handleApiKeyChange}
        isOnline={isOnline}
        isChecking={isChecking}
        runnerInfo={runnerInfo}
        onCheckConnection={checkConnection}
      />

      <nav className="tabs-nav" aria-label="Recursos do CoffeeMail SDK">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "introspect"}
          className={activeTab === "introspect" ? "active" : ""}
          onClick={() => setActiveTab("introspect")}
        >
          {UI_STRINGS.TABS.INTROSPECT}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "emails"}
          className={activeTab === "emails" ? "active" : ""}
          onClick={() => setActiveTab("emails")}
        >
          {UI_STRINGS.TABS.EMAILS}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "domains"}
          className={activeTab === "domains" ? "active" : ""}
          onClick={() => setActiveTab("domains")}
        >
          {UI_STRINGS.TABS.DOMAINS}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "templates"}
          className={activeTab === "templates" ? "active" : ""}
          onClick={() => setActiveTab("templates")}
        >
          {UI_STRINGS.TABS.TEMPLATES}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "audiences"}
          className={activeTab === "audiences" ? "active" : ""}
          onClick={() => setActiveTab("audiences")}
        >
          {UI_STRINGS.TABS.AUDIENCES}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "suppressions"}
          className={activeTab === "suppressions" ? "active" : ""}
          onClick={() => setActiveTab("suppressions")}
        >
          {UI_STRINGS.TABS.SUPPRESSIONS}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "webhooks"}
          className={activeTab === "webhooks" ? "active" : ""}
          onClick={() => setActiveTab("webhooks")}
        >
          {UI_STRINGS.TABS.WEBHOOKS}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === "stats"}
          className={activeTab === "stats" ? "active" : ""}
          onClick={() => setActiveTab("stats")}
        >
          {UI_STRINGS.TABS.STATS}
        </button>
      </nav>

      <main>{renderActiveModule()}</main>
    </div>
  );
};

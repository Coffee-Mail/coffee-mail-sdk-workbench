export const RUNNER_ENDPOINTS = {
  RUNNER_INFO: "/api/v1/runner/info",
  INTROSPECT: "/api/v1/client/introspect",
  EMAILS: {
    SEND: "/api/v1/emails/send",
    LIST: "/api/v1/emails",
    GET_BY_ID: (id: string) => `/api/v1/emails/${id}`,
  },
  DOMAINS: {
    LIST: "/api/v1/domains",
    CREATE: "/api/v1/domains",
    GET_BY_ID: (id: string) => `/api/v1/domains/${id}`,
    VERIFY: (id: string) => `/api/v1/domains/${id}/verify`,
    HEALTH: (id: string) => `/api/v1/domains/${id}/health`,
  },
  TEMPLATES: {
    LIST: "/api/v1/templates",
    CREATE: "/api/v1/templates",
    GET_BY_ID: (id: string) => `/api/v1/templates/${id}`,
    PREVIEW: (id: string) => `/api/v1/templates/${id}/preview`,
  },
  AUDIENCES: {
    LIST: "/api/v1/audiences",
    CREATE: "/api/v1/audiences",
    GET_BY_ID: (id: string) => `/api/v1/audiences/${id}`,
    CONTACTS: (audienceId: string) => `/api/v1/audiences/${audienceId}/contacts`,
  },
  SUPPRESSIONS: {
    LIST: "/api/v1/suppressions",
    CREATE: "/api/v1/suppressions",
    DELETE: (email: string) => `/api/v1/suppressions/${encodeURIComponent(email)}`,
  },
  WEBHOOKS: {
    LIST: "/api/v1/webhooks",
    CREATE: "/api/v1/webhooks",
    GET_BY_ID: (id: string) => `/api/v1/webhooks/${id}`,
    TEST: (id: string) => `/api/v1/webhooks/${id}/test`,
  },
  STATS: {
    GET: "/api/v1/stats",
  },
} as const;

export const RUNNER_HEADERS = {
  API_KEY: "x-coffeemail-api-key",
} as const;

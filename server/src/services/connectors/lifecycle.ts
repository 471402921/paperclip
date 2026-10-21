import { getAppDefinitionForApplicationKey, getConnectableAppDefinition, type AppDefinition } from "@paperclipai/shared";
import { NOTEBOOK_APP_SLUG, notebookAppConfiguration } from "./paperclip-notebook/index.js";
import { notebookOAuthLifecycle } from "./paperclip-notebook/oauth.js";

type ConnectionIdentity = { config?: Record<string, unknown>; transportConfig?: Record<string, unknown> };
export interface ConnectorOAuthLifecycle {
  refreshTokenRetry?: "idempotency-key";
  accountIdentity?: (input: { endpoint: string; accessToken: string; send: (url: URL, init: RequestInit) => Promise<Response> }) => Promise<{ name: string; externalId: string; connectionName: string }>;
}
interface ConnectorLifecycle {
  configureApp?: (app: AppDefinition) => AppDefinition;
  oauth?: ConnectorOAuthLifecycle;
}
const lifecycles: ReadonlyMap<string, ConnectorLifecycle> = new Map([
  [NOTEBOOK_APP_SLUG, {
    configureApp: notebookAppConfiguration,
    oauth: notebookOAuthLifecycle,
  }],
]);

export function connectorAppDefinition(connection: ConnectionIdentity, applicationKey?: unknown): AppDefinition | null {
  if (applicationKey !== undefined && applicationKey !== null) return getAppDefinitionForApplicationKey(applicationKey);
  const marker = connection.config?.sourceTemplateKey ?? connection.transportConfig?.sourceTemplateKey;
  return typeof marker === "string" ? getConnectableAppDefinition(marker) : null;
}
export function applyConnectorAppConfiguration(app: AppDefinition): AppDefinition {
  return lifecycles.get(app.slug)?.configureApp?.(app) ?? app;
}
export function connectorOAuthLifecycle(app: AppDefinition | null): ConnectorOAuthLifecycle | undefined {
  return app ? lifecycles.get(app.slug)?.oauth : undefined;
}

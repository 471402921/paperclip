import { getAppDefinitionForApplicationKey, getConnectableAppDefinition, type AppDefinition } from "@paperclipai/shared";
import { NOTEBOOK_APP_SLUG, notebookAppConfiguration } from "./paperclip-notebook/index.js";
import { notebookOAuthLifecycle } from "./paperclip-notebook/oauth.js";

type ConnectionIdentity = { config?: Record<string, unknown>; transportConfig?: Record<string, unknown> };
export interface ConnectorOAuthLifecycle {
  refreshTokenRetry?: "idempotency-key";
  accountIdentity?: (input: { endpoint: string; accessToken: string; send: (url: URL, init: RequestInit) => Promise<Response> }) => Promise<{ name: string; externalId: string; connectionName: string }>;
}
export interface ConnectorLifecycleContribution {
  applicationSlug: string;
  configureApp?: (app: AppDefinition) => AppDefinition;
  oauth?: ConnectorOAuthLifecycle;
}

export function createConnectorLifecycleRegistry(contributions: readonly ConnectorLifecycleContribution[]) {
  const registered = new Map(contributions.map(contribution => [contribution.applicationSlug, contribution]));
  if (registered.size !== contributions.length) throw new Error("connector_lifecycle_duplicate_adapter");
  return {
    applyAppConfiguration: (app: AppDefinition): AppDefinition => registered.get(app.slug)?.configureApp?.(app) ?? app,
    oauthForApp: (app: AppDefinition | null): ConnectorOAuthLifecycle | undefined => app ? registered.get(app.slug)?.oauth : undefined,
  };
}

const lifecycles = createConnectorLifecycleRegistry([{
  applicationSlug: NOTEBOOK_APP_SLUG,
  configureApp: notebookAppConfiguration,
  oauth: notebookOAuthLifecycle,
}]);

export function connectorAppDefinition(connection: ConnectionIdentity, applicationKey?: unknown): AppDefinition | null {
  if (applicationKey !== undefined && applicationKey !== null) return getAppDefinitionForApplicationKey(applicationKey);
  const marker = connection.config?.sourceTemplateKey ?? connection.transportConfig?.sourceTemplateKey;
  return typeof marker === "string" ? getConnectableAppDefinition(marker) : null;
}
export const applyConnectorAppConfiguration = lifecycles.applyAppConfiguration;
export const connectorOAuthLifecycle = lifecycles.oauthForApp;

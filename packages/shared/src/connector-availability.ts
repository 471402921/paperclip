import { getConnectableAppDefinition } from "./app-definitions.js";
import type { AppDefinition } from "./types/app-definition.js";
import type { InstanceExperimentalSettings } from "./types/instance.js";

export function getAppDefinitionForApplicationKey(key: unknown): AppDefinition | null {
  if (typeof key !== "string") return null;
  const gallery = /^app-gallery:([a-z0-9]+(?:-[a-z0-9]+)*):[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.exec(key);
  return getConnectableAppDefinition(gallery ? gallery[1].toLowerCase() : key);
}

export function isConnectorFeatureEnabled(
  app: Pick<AppDefinition, "experimentalFeatureKey"> | null | undefined,
  settings: Partial<InstanceExperimentalSettings> | null | undefined,
): boolean {
  return !app?.experimentalFeatureKey || settings?.[app.experimentalFeatureKey] === true;
}

export function resolveConnectorAvailability(
  app: AppDefinition,
  settings: Partial<InstanceExperimentalSettings> | null | undefined,
): AppDefinition {
  return isConnectorFeatureEnabled(app, settings) ? app : {
    ...app,
    availability: { ...app.availability, available: false, reason: `${app.name} is not available on this instance.` },
  };
}

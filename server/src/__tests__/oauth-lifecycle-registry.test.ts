import { describe, expect, it, vi } from "vitest";
import { getConnectableAppDefinition } from "@paperclipai/shared";
import { applyConnectorAppConfiguration, connectorAppDefinition, connectorOAuthLifecycle, createConnectorLifecycleRegistry } from "../services/connectors/lifecycle.js";

describe("trusted OAuth lifecycle adapters", () => {
  it("has no bundled provider behavior until a provider contributes an adapter", () => {
    const app = getConnectableAppDefinition("fireflies")!;
    expect(applyConnectorAppConfiguration(app)).toBe(app);
    expect(connectorOAuthLifecycle(app)).toBeUndefined();
    expect(connectorOAuthLifecycle(null)).toBeUndefined();
  });

  it("uses saved application identity instead of mutable connection markers", () => {
    const connection = { config: { sourceTemplateKey: "fireflies", refreshTokenRetry: "idempotency-key", oauth: { accountIdentity: true } } };
    expect(connectorAppDefinition(connection, "custom-mcp")).toBeNull();
    expect(connectorAppDefinition(connection, "app-gallery:slack:44444444-4444-4444-8444-444444444444")?.slug).toBe("slack");
    expect(connectorAppDefinition(connection)?.slug).toBe("fireflies");
    expect(connectorOAuthLifecycle(connectorAppDefinition(connection))).toBeUndefined();
  });

  it("applies only compiled contributions for the selected catalog provider", () => {
    const accountIdentity = vi.fn(async () => ({ name: "Account", externalId: "account", connectionName: "Example · Account" }));
    const adapter = { refreshTokenRetry: "idempotency-key" as const, accountIdentity };
    const registry = createConnectorLifecycleRegistry([{ applicationSlug: "fireflies", oauth: adapter,
      configureApp: app => ({ ...app, name: "Configured provider" }) }]);
    expect(registry.oauthForApp(getConnectableAppDefinition("fireflies"))).toBe(adapter);
    expect(registry.oauthForApp(getConnectableAppDefinition("slack"))).toBeUndefined();
    expect(registry.applyAppConfiguration(getConnectableAppDefinition("fireflies")!).name).toBe("Configured provider");
    expect(() => createConnectorLifecycleRegistry([{ applicationSlug: "fireflies" }, { applicationSlug: "fireflies" }])).toThrow("duplicate_adapter");
  });
});

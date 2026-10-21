import { describe, expect, it, vi } from "vitest";
import { revokeOAuthToken, selectOAuthRevocationAuthMethod } from "../services/oauth-revocation.js";
import { connectorAppDefinition, connectorOAuthLifecycle } from "../services/connectors/lifecycle.js";

describe("generic OAuth lifecycle capabilities", () => {
  it("uses the exact advertised revocation endpoint and configured client authentication", async () => {
    const send = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.href).toBe("https://authorization.example.test/tenant/vendor/disconnect");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(init.headers).get("authorization")).toBe(`Basic ${Buffer.from("client:fixture-secret").toString("base64")}`);
      expect(new URLSearchParams(init.body as string).get("token")).toBe("fixture-refresh");
      expect(new URLSearchParams(init.body as string).get("token_type_hint")).toBe("refresh_token");
      return new Response(null, { status: 200 });
    });
    await revokeOAuthToken({ revocationUrl: "https://authorization.example.test/tenant/vendor/disconnect", clientId: "client", clientSecret: "fixture-secret", authMethod: "client_secret_basic", token: "fixture-refresh", refresh: true, send });
    expect(send).toHaveBeenCalledOnce();
    expect(selectOAuthRevocationAuthMethod({ advertised: ["client_secret_post"], fallback: "client_secret_basic", hasSecret: true })).toBe("client_secret_post");
    expect(() => selectOAuthRevocationAuthMethod({ advertised: ["private_key_jwt"], fallback: "none", hasSecret: false })).toThrow(/unsupported/);
  });

  it("does not adopt privileged lifecycle capabilities from editable connection config", () => {
    const connection = { config: { sourceTemplateKey: "paperclip-notebook", refreshTokenRetry: "idempotency-key", oauth: { refreshTokenRetry: "idempotency-key" } } };
    const custom = connectorAppDefinition(connection, "custom-mcp");
    expect(custom).toBeNull();
    expect(connectorOAuthLifecycle(custom)).toBeUndefined();
    expect(connectorOAuthLifecycle(connectorAppDefinition({}, "app-gallery:paperclip-notebook:44444444-4444-4444-8444-444444444444"))?.refreshTokenRetry).toBe("idempotency-key");
    const unrelated = connectorAppDefinition(connection, "fireflies");
    expect(unrelated?.slug).toBe("fireflies");
    expect(connectorOAuthLifecycle(unrelated)).toBeUndefined();
  });
});

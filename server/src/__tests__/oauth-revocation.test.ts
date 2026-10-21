import { describe, expect, it, vi } from "vitest";
import { revokeOAuthToken, selectOAuthRevocationAuthMethod } from "../services/oauth-revocation.js";

describe("OAuth revocation requests", () => {
  it("uses the advertised endpoint and its distinct client authentication", async () => {
    const send = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.href).toBe("https://authorization.example.test/tenant/vendor/disconnect");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(new Headers(init.headers).get("authorization")).toBe(`Basic ${Buffer.from("client:fixture-secret").toString("base64")}`);
      const body = new URLSearchParams(init.body as string);
      expect(body.get("token")).toBe("fixture-refresh");
      expect(body.get("token_type_hint")).toBe("refresh_token");
      return new Response(null, { status: 200 });
    });
    await revokeOAuthToken({ revocationUrl: "https://authorization.example.test/tenant/vendor/disconnect", clientId: "client", clientSecret: "fixture-secret", authMethod: "client_secret_basic", token: "fixture-refresh", refresh: true, send });
    expect(send).toHaveBeenCalledOnce();
    expect(selectOAuthRevocationAuthMethod({ advertised: ["client_secret_post"], fallback: "client_secret_basic", hasSecret: true })).toBe("client_secret_post");
    expect(() => selectOAuthRevocationAuthMethod({ advertised: ["private_key_jwt"], fallback: "none", hasSecret: false })).toThrow(/unsupported/);
  });

  it("leaves failed remote revocation pending", async () => {
    await expect(revokeOAuthToken({ revocationUrl: "https://authorization.example.test/revoke", clientId: "public-client", authMethod: "none",
      token: "fixture-access", refresh: false, send: async () => new Response(null, { status: 503 }) })).rejects.toMatchObject({ details: { code: "oauth_revocation_pending" } });
  });
});

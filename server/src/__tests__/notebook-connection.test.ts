import { describe, expect, it, vi } from "vitest";
import { getConnectableAppDefinition } from "@paperclipai/shared";
import { notebookAccountIdentity, notebookAppConfiguration, revokeNotebookToken } from "../services/notebook-connection.js";

describe("Notebook connection", () => {
  const app = getConnectableAppDefinition("paperclip-notebook")!;

  it("requires explicit deployment configuration and retains direct OAuth scopes", () => {
    expect(notebookAppConfiguration(app, "").availability?.available).toBe(false);
    const configured = notebookAppConfiguration(app, "https://notebook.example.test/mcp");
    expect(configured.availability?.available).toBe(true);
    expect(configured.methods[0]).toMatchObject({ auth: "oauth", ownershipModes: ["dcr"], grantKinds: ["user"],
      defaults: { serverUrl: "https://notebook.example.test/mcp", scopesHint: ["notebook:read", "notebook:write", "notebook:share", "notebook:delete"] } });
    expect(configured.methods[0]?.oauthStrategy).toBeUndefined();
    expect(app.availability?.available).toBe(false);
  });

  it.each(["https://user:password@example.test/mcp", "http://example.test/mcp", "https://example.test/mcp?token=secret", "https://example.test/mcp#secret", "https://example.test/"])("rejects invalid deployment endpoint %s", endpoint => {
    expect(notebookAppConfiguration(app, endpoint).availability?.available).toBe(false);
  });

  it("gets the account through an authenticated MCP session without trusting display text", async () => {
    const calls: Record<string, unknown>[] = [];
    const send = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(new Headers(init.headers).get("authorization")).toBe("Bearer test-access");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      const rpc = JSON.parse(init.body as string);
      calls.push(rpc);
      if (rpc.method === "notifications/initialized") return new Response(null, { status: 202 });
      return Response.json({ jsonrpc: "2.0", id: rpc.id, result: rpc.method === "initialize"
        ? { protocolVersion: "2025-06-18", capabilities: {}, serverInfo: { name: "Notebook", version: "1" } }
        : { content: [{ type: "text", text: "attacker@example.test" }], structuredContent: { id: "cloud-user", email: "owner@example.test", emailVerified: true } } });
    });
    await expect(notebookAccountIdentity("https://notebook.example.test/mcp", "test-access", send))
      .resolves.toEqual({ id: "cloud-user", email: "owner@example.test", emailVerified: true });
    expect(calls.map(call => call.method)).toEqual(["initialize", "notifications/initialized", "tools/call"]);
    expect(calls.at(-1)?.params).toEqual({ name: "notebook_get_account", arguments: {} });
  });

  it("does not reflect malformed or failed provider responses", async () => {
    const send = vi.fn(async (_url: URL, init: RequestInit) => {
      const rpc = JSON.parse(init.body as string);
      if (rpc.method === "notifications/initialized") return new Response(null, { status: 202 });
      return Response.json({ jsonrpc: "2.0", id: rpc.id, result: rpc.method === "initialize"
        ? { protocolVersion: "2025-06-18" }
        : { structuredContent: { id: "cloud-user", email: "invalid\nBearer test-access", emailVerified: true } } });
    });
    await expect(notebookAccountIdentity("https://notebook.example.test/mcp", "test-access", send))
      .rejects.toMatchObject({ message: "Notebook could not confirm the connected account. Try signing in again.", details: { code: "notebook_account_unavailable" } });
  });

  it("revokes using the token endpoint's first-party sibling and bounds network work", async () => {
    const send = vi.fn(async (url: URL, init: RequestInit) => {
      expect(url.href).toBe("https://notebook.example.test/oauth/revoke");
      expect(init.signal).toBeInstanceOf(AbortSignal);
      expect(new URLSearchParams(init.body as string).get("token")).toBe("test-refresh");
      expect(new URLSearchParams(init.body as string).get("client_id")).toBe("client");
      return new Response(null, { status: 200 });
    });
    await revokeNotebookToken({ endpoint: "https://notebook.example.test/mcp", clientId: "client", token: "test-refresh", refresh: true, send });
    expect(send).toHaveBeenCalledOnce();
  });
});

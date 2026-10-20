import type { AppDefinition } from "@paperclipai/shared";
import { HttpError, unprocessable } from "../errors.js";
import { initializeMcpHttpSession, mcpHttpRequestHeaders, readMcpHttpResponse } from "./mcp-http.js";

export const NOTEBOOK_APP_SLUG = "paperclip-notebook";

export function notebookAppConfiguration(app: AppDefinition, configuredUrl = process.env.PAPERCLIP_NOTEBOOK_MCP_URL): AppDefinition {
  if (app.slug !== NOTEBOOK_APP_SLUG) return app;
  let endpoint: URL;
  try {
    endpoint = new URL(configuredUrl?.trim() ?? "");
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if ((endpoint.protocol !== "https:" && !(endpoint.protocol === "http:" && loopback))
      || endpoint.username || endpoint.password || endpoint.search || endpoint.hash || !endpoint.pathname.endsWith("/mcp")) throw new Error();
  } catch {
    return { ...app, availability: { available: false, reason: configuredUrl
      ? "Paperclip Notebook needs a valid HTTPS MCP endpoint. Ask the instance operator to check its configuration."
      : "Paperclip Notebook is not configured on this instance." } };
  }
  return { ...app, availability: { available: true }, urlPatterns: [endpoint.href],
    methods: app.methods.map(method => ({ ...method, defaults: { ...method.defaults, serverUrl: endpoint.href } })) };
}

export type NotebookAccountIdentity = { id: string; email: string; emailVerified: boolean };
type Send = (url: URL, init: RequestInit) => Promise<Response>;

export async function notebookAccountIdentity(endpoint: string, accessToken: string, send: Send): Promise<NotebookAccountIdentity> {
  const signal = AbortSignal.timeout(10_000);
  const url = new URL(endpoint);
  try {
    const requestId = "paperclip-notebook-account";
    const headers = await initializeMcpHttpSession({ requestId, headers: { Authorization: `Bearer ${accessToken}` },
      send: init => send(url, { ...init, signal }) });
    const response = await send(url, { method: "POST", signal, headers: mcpHttpRequestHeaders(headers),
      body: JSON.stringify({ jsonrpc: "2.0", id: requestId, method: "tools/call", params: { name: "notebook_get_account", arguments: {} } }) });
    if (!response.ok) { await response.body?.cancel(); throw new Error(); }
    const payload = await readMcpHttpResponse(response, requestId, { maxBytes: 16_384 }) as { result?: { isError?: boolean; structuredContent?: unknown } };
    const account = payload?.result?.structuredContent as Partial<NotebookAccountIdentity> | null;
    if (payload?.result?.isError || !account || typeof account.id !== "string" || !account.id.trim() || account.id.length > 256
      || typeof account.email !== "string" || account.email.length > 320 || !/^[^\s@\x00-\x1f]+@[^\s@\x00-\x1f]+$/.test(account.email)
      || typeof account.emailVerified !== "boolean") throw new Error();
    return { id: account.id, email: account.email, emailVerified: account.emailVerified };
  } catch {
    throw new HttpError(502, "Notebook could not confirm the connected account. Try signing in again.", { code: "notebook_account_unavailable" });
  }
}

export async function revokeNotebookToken(input: { endpoint: string; clientId: string; token: string; refresh: boolean; send: Send }) {
  let url: URL;
  try { url = new URL("/oauth/revoke", input.endpoint); }
  catch { throw unprocessable("Notebook authorization is missing its endpoint"); }
  const response = await input.send(url, { method: "POST", signal: AbortSignal.timeout(10_000),
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ token: input.token, token_type_hint: input.refresh ? "refresh_token" : "access_token", client_id: input.clientId }).toString() });
  await response.body?.cancel();
  if (!response.ok) throw new HttpError(502, "Notebook authorization revocation is pending.", { code: "notebook_revocation_pending" });
}

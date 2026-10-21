import { HttpError } from "../../../errors.js";
import { initializeMcpHttpSession, mcpHttpRequestHeaders, readMcpHttpResponse } from "../../mcp-http.js";

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

export const notebookOAuthLifecycle = {
  refreshTokenRetry: "idempotency-key" as const,
  accountIdentity: async (input: { endpoint: string; accessToken: string; send: Send }) => {
    const account = await notebookAccountIdentity(input.endpoint, input.accessToken, input.send);
    return { name: account.email, externalId: account.id, connectionName: `Paperclip Notebook · ${account.email}`.slice(0, 160) };
  },
};

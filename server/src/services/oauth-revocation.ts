import { HttpError, unprocessable } from "../errors.js";

type ClientAuthMethod = "none" | "client_secret_basic" | "client_secret_post";
export function selectOAuthRevocationAuthMethod(input: { advertised: unknown; fallback: ClientAuthMethod; hasSecret: boolean }): ClientAuthMethod {
  const methods = Array.isArray(input.advertised) ? input.advertised.filter((method): method is string => typeof method === "string") : [];
  if (!methods.length) return input.fallback;
  if (methods.includes(input.fallback)) return input.fallback;
  if (input.hasSecret && methods.includes("client_secret_basic")) return "client_secret_basic";
  if (input.hasSecret && methods.includes("client_secret_post")) return "client_secret_post";
  if (methods.includes("none")) return "none";
  throw unprocessable("The authorization server requires unsupported revocation authentication", { code: "oauth_revocation_auth_unsupported" });
}

export async function revokeOAuthToken(input: {
  revocationUrl: string;
  clientId: string;
  clientSecret?: string | null;
  authMethod: ClientAuthMethod;
  token: string;
  refresh: boolean;
  send: (url: URL, init: RequestInit) => Promise<Response>;
}) {
  const body = new URLSearchParams({ token: input.token, token_type_hint: input.refresh ? "refresh_token" : "access_token" });
  const headers: Record<string, string> = { "content-type": "application/x-www-form-urlencoded", accept: "application/json" };
  if (input.authMethod !== "client_secret_basic") body.set("client_id", input.clientId);
  if (input.authMethod !== "none") {
    if (!input.clientSecret) throw unprocessable("OAuth client secret is missing for revocation", { code: "oauth_client_secret_missing" });
    if (input.authMethod === "client_secret_post") body.set("client_secret", input.clientSecret);
    else {
      const encode = (value: string) => new URLSearchParams({ value }).toString().slice(6);
      headers.Authorization = `Basic ${Buffer.from(`${encode(input.clientId)}:${encode(input.clientSecret)}`).toString("base64")}`;
    }
  }
  const response = await input.send(new URL(input.revocationUrl), { method: "POST", signal: AbortSignal.timeout(10_000), headers, body: body.toString() });
  await response.body?.cancel();
  if (!response.ok) throw new HttpError(502, "OAuth authorization revocation is pending.", { code: "oauth_revocation_pending" });
}

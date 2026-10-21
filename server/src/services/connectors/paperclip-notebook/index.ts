import type { AppDefinition } from "@paperclipai/shared";

export const NOTEBOOK_APP_SLUG = "paperclip-notebook";

export function notebookAppConfiguration(app: AppDefinition, configuredUrl = process.env.PAPERCLIP_NOTEBOOK_MCP_URL
  ?? app.methods.find(method => method.transport === "mcp_remote")?.defaults?.serverUrl): AppDefinition {
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

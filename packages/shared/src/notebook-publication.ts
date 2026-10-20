function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
}
const identifier = (value: unknown): value is string => typeof value === "string" && value.length > 0 && value.length <= 256;

/** Read intact MCP data, never the gateway's shortened audit summary. */
export function readNotebookPublicationResult(tool: string, response: unknown): Record<string, unknown> | undefined {
  const outer = record(response);
  if (!outer || outer.isError === true) return;
  const result = record(outer.data) ?? outer;
  if (result.isError === true) return;
  let value = record(result.structuredContent);
  if (!value && Array.isArray(result.content)) {
    const text = result.content.map(record).find(item => item?.type === "text" && typeof item.text === "string")?.text;
    if (typeof text === "string") { try { value = record(JSON.parse(text)); } catch { return; } }
  }
  if (!value) return;
  if (tool === "notebook_create_page")
    return identifier(value.id) && Number.isSafeInteger(value.version) && Number(value.version) > 0 ? value : undefined;
  if (tool === "notebook_begin_upload") {
    if (!identifier(value.deploymentId) || !Array.isArray(value.uploads) || value.uploads.length > 200
      || value.status !== undefined && !identifier(value.status)) return;
    return value.uploads.every(candidate => {
      const ticket = record(candidate);
      return ticket && typeof ticket.path === "string" && ticket.path.length > 0 && typeof ticket.url === "string" && ticket.url.length > 0
        && (ticket.method === undefined || ticket.method === "PUT")
        && (ticket.headers === undefined || !!record(ticket.headers) && Object.values(record(ticket.headers)!).every(header => typeof header === "string"));
    }) ? value : undefined;
  }
  if (tool === "notebook_finalize_upload")
    return identifier(value.operationId ?? value.id) && identifier(value.status) ? value : undefined;
}

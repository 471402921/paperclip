import { getAppDefinitionForApplicationKey, readNotebookPublicationResult } from "@paperclipai/shared";
import type { createAssignedMcpTools } from "../../native-runtime/assigned-mcp-tools.js";
import { ToolGatewayHttpError } from "../../tool-gateway.js";

type AssignedTools = Awaited<ReturnType<typeof createAssignedMcpTools>>;

export function notebookPublicationClient(tools: AssignedTools) {
  const connectionIds = () => {
    const connections = new Map<string, Set<string>>();
    for (const tool of tools.connectionTools("standard")) {
      if (getAppDefinitionForApplicationKey(tool.applicationKey)?.slug !== "paperclip-notebook" || !tool.connectionId) continue;
      const names = connections.get(tool.connectionId) ?? new Set<string>();
      names.add(tool.upstreamToolName ?? ""); connections.set(tool.connectionId, names);
    }
    return [...connections].filter(([, names]) => names.has("notebook_begin_upload") && names.has("notebook_finalize_upload")).map(([id]) => id);
  };
  const call = async (connectionId: string, name: string, parameters: Record<string, unknown>): Promise<unknown> => {
    if (!connectionIds().includes(connectionId)) throw new Error("assigned_notebook_tool_unavailable");
    const receipt = parameters.receipt as { kind?: unknown } | undefined;
    const response = await tools.callConnectionTool(connectionId, name, parameters, {
      workMode: "standard",
      privateTransfer: name === "notebook_begin_upload" || name === "notebook_get_operation" && receipt?.kind === "begin_upload",
    });
    if (response.status === "replayed") {
      const complete = readNotebookPublicationResult(name, response.result);
      if (complete) return complete;
      const kind = name === "notebook_create_page" ? "create_page" : name === "notebook_begin_upload" ? "begin_upload" : undefined;
      if (kind) return call(connectionId, "notebook_get_operation", { receipt: { kind, idempotencyKey: parameters.idempotencyKey } });
      if (name === "notebook_finalize_upload") return call(connectionId, "notebook_get_operation", { operationId: parameters.deploymentId });
    }
    const recoveryError = () => new Error("Notebook receipt recovery returned a shortened approval result. Set notebook_get_operation to Allowed for this recovery, then retry with the same publication key.");
    if (response.status === "replayed" && name === "notebook_get_operation" && (!response.result || typeof response.result !== "object")) throw recoveryError();
    if (!response.result || typeof response.result !== "object" || "isError" in response.result && response.result.isError === true)
      throw new ToolGatewayHttpError(502, "Notebook returned an error.", "tool_error");
    const outer = response.result as { data?: unknown; structuredContent?: unknown };
    const payload = outer.data && typeof outer.data === "object" ? outer.data as { structuredContent?: unknown; isError?: boolean } : outer;
    if ("isError" in payload && payload.isError === true) throw new ToolGatewayHttpError(502, "Notebook returned an error.", "tool_error");
    if (!payload.structuredContent || typeof payload.structuredContent !== "object") {
      if (response.status === "replayed" && name === "notebook_get_operation") throw recoveryError();
      throw new Error("assigned_notebook_invalid_response");
    }
    return payload.structuredContent;
  };
  return {
    connectionIds,
    async assertAvailable(connectionId: string) {
      if (!connectionIds().includes(connectionId)) throw new Error("assigned_notebook_tool_unavailable");
      await tools.assertConnectionTools(connectionId, ["notebook_begin_upload", "notebook_finalize_upload"], "standard");
    },
    call,
  };
}

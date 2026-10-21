import { describe, expect, it, vi } from "vitest";
import { createConnectorTransferRegistry, type ConnectorTransferAdapter } from "../services/connectors/private-transfer.js";
import { createConnectorWorkspaceTools, type AssignedConnectionTools } from "../services/connectors/runtime-tools.js";
import { createAssignedMcpTools } from "../services/native-runtime/assigned-mcp-tools.js";
import type { ToolGatewayDescriptor, ToolGatewayService } from "../services/tool-gateway.js";

describe("connector contributions", () => {
  it("admits a second provider's private result projection without leaking it into the normal result", () => {
    const prepare = vi.fn((result: unknown) => ({ result: { public: "ready" }, privateTransfer: { restore: () => result } }));
    const adapter: ConnectorTransferAdapter = { applicationSlug: "fireflies", supports: (_tool, parameters) => parameters === "transfer", prepare };
    const registry = createConnectorTransferRegistry([adapter]);
    const tool = { providerType: "mcp_remote_http", applicationKey: "app-gallery:fireflies:44444444-4444-4444-8444-444444444444", connectionId: "selected" };
    const raw = { temporaryCapability: "synthetic-private-value" };
    expect(registry.supports(tool, "transfer")).toBe(true);
    const prepared = registry.prepare(raw, tool, "transfer");
    expect(prepared.result).toEqual({ public: "ready" });
    expect(prepared.privateTransfer!.restore(prepared.result)).toEqual(raw);
    expect(registry.supports(tool, "ordinary")).toBe(false);
    expect(registry.supports({ ...tool, applicationKey: "app-gallery:unknown:44444444-4444-4444-8444-444444444444" }, "transfer")).toBe(false);
    expect(registry.supports({ ...tool, applicationKey: "paperclip-notebook" }, "transfer")).toBe(false);
    expect(registry.prepare(raw, tool, "ordinary")).toEqual({ result: raw });
    expect(prepare).toHaveBeenCalledOnce();
  });

  it("binds contributed calls to pinned connection tools and fresh policies without interpreting provider results", async () => {
    const descriptor = { name: "gateway:export", connectionId: "selected", applicationKey: "fireflies", upstreamToolName: "export", risk: "write",
      description: "Export", displayName: "Export", parametersSchema: { type: "object" }, providerType: "mcp_remote_http" } as ToolGatewayDescriptor;
    const list = vi.fn().mockResolvedValue([descriptor]);
    const response = { status: "replayed", invocationId: "synthetic-invocation", result: { safeProviderReceipt: 42 } };
    const execute = vi.fn().mockResolvedValue(response);
    const tools = await createAssignedMcpTools({ gateway: { listToolsForNamedGateway: list, executeTool: execute } as unknown as ToolGatewayService,
      gatewayPublicId: "selected-gateway", bearerToken: "synthetic-run-credential" });
    const contribution = { name: "export_workspace", definitions: (tools: AssignedConnectionTools) => tools.connectionTools().length ? [{ name: "export_workspace" }] : [],
      execute: (_args: unknown, context: { tools: AssignedConnectionTools }) => context.tools.callConnectionTool("selected", "export", {}, { privateTransfer: true }) };
    const registry = createConnectorWorkspaceTools([contribution]);
    const authorize = vi.fn(async () => undefined);
    const context = { tools, workspaceRoot: "/approved", authorize };
    expect(registry.definitions(tools)).toEqual([{ name: "export_workspace" }]);
    await expect(registry.execute("export_workspace", {}, context)).resolves.toEqual(response);
    expect(execute).toHaveBeenCalledExactlyOnceWith({ gatewayPublicId: "selected-gateway", sessionToken: "synthetic-run-credential",
      tool: descriptor.name, parameters: {}, privateTransfer: { connectionId: "selected" } });
    await expect(tools.callConnectionTool("another", "export", {})).rejects.toThrow("assigned_connection_tool_unavailable");
    await expect(tools.callConnectionTool("selected", "export", {}, { workMode: "ask" })).rejects.toThrow("paperclip_runner_tool_mode_denied");
    list.mockResolvedValue([{ ...descriptor, applicationKey: "another-provider" }]);
    await expect(registry.execute("export_workspace", {}, context)).rejects.toThrow("assigned_connection_tool_unavailable");
    list.mockResolvedValue([]);
    await expect(registry.execute("export_workspace", {}, context)).rejects.toThrow("assigned_connection_tool_unavailable");
    authorize.mockRejectedValue(new Error("run-ended"));
    await expect(registry.execute("export_workspace", {}, context)).rejects.toThrow("run-ended");
    expect(execute).toHaveBeenCalledOnce();
  });
});

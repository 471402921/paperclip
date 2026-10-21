import type { createAssignedMcpTools } from "../native-runtime/assigned-mcp-tools.js";
import type { RemoteWorkspaceFileReader } from "../native-runtime/native-runner-file-handoff.js";
import { notebookWorkspaceTool } from "./paperclip-notebook/runtime-tool.js";

export type AssignedConnectionTools = Awaited<ReturnType<typeof createAssignedMcpTools>>;
export interface ConnectorWorkspaceContext {
  tools: AssignedConnectionTools;
  workspaceRoot: string;
  executionTargetKind?: "local" | "remote";
  readRemoteWorkspaceFile?: RemoteWorkspaceFileReader;
  authorize: () => Promise<void>;
}

export interface ConnectorWorkspaceToolContribution {
  name: string;
  definitions: (tools: AssignedConnectionTools) => Record<string, unknown>[];
  execute: (argumentsValue: unknown, context: ConnectorWorkspaceContext) => Promise<unknown>;
}

export function createConnectorWorkspaceTools(contributions: readonly ConnectorWorkspaceToolContribution[]) {
  const byName = new Map(contributions.map(contribution => [contribution.name, contribution]));
  if (byName.size !== contributions.length) throw new Error("connector_workspace_tool_duplicate");
  return {
    definitions: (tools: AssignedConnectionTools) => contributions.flatMap(contribution => contribution.definitions(tools)),
    has: (name: string) => byName.has(name),
    async execute(name: string, argumentsValue: unknown, context: ConnectorWorkspaceContext) {
      const contribution = byName.get(name);
      if (!contribution) throw new Error("connector_workspace_tool_unknown");
      await context.authorize();
      return contribution.execute(argumentsValue, context);
    },
  };
}

export const connectorWorkspaceTools = createConnectorWorkspaceTools([notebookWorkspaceTool]);

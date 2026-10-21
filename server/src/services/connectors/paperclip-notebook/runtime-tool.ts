import type { ConnectorWorkspaceToolContribution } from "../runtime-tools.js";
import { notebookPublicationClient } from "./publication-client.js";
import { NOTEBOOK_PUBLISH_TOOL, publishNotebookWorkspaceFiles } from "./publishing.js";

export const notebookWorkspaceTool: ConnectorWorkspaceToolContribution = {
  name: NOTEBOOK_PUBLISH_TOOL.name,
  definitions(tools) {
    const connectionIds = notebookPublicationClient(tools).connectionIds();
    return connectionIds.length ? [{ ...NOTEBOOK_PUBLISH_TOOL, inputSchema: {
      ...NOTEBOOK_PUBLISH_TOOL.inputSchema,
      properties: { ...NOTEBOOK_PUBLISH_TOOL.inputSchema.properties, connectionId: { type: "string", enum: connectionIds } },
    } }] : [];
  },
  execute: (argumentsValue, context) => publishNotebookWorkspaceFiles({ ...context, arguments: argumentsValue }),
};

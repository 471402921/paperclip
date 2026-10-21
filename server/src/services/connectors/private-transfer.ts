import { getAppDefinitionForApplicationKey } from "@paperclipai/shared";

export interface ConnectorTransferTool {
  providerType?: unknown;
  applicationKey?: unknown;
  connectionId?: unknown;
  upstreamToolName?: unknown;
}

export interface ConnectorTransferProjection {
  restore: (safeResult: unknown) => unknown;
}

export interface PreparedConnectorResult {
  result: unknown;
  privateTransfer?: ConnectorTransferProjection;
}

export interface ConnectorTransferAdapter {
  applicationSlug: string;
  supports: (tool: ConnectorTransferTool, parameters: unknown) => boolean;
  prepare: (result: unknown, tool: ConnectorTransferTool, parameters: unknown) => PreparedConnectorResult;
}

export function createConnectorTransferRegistry(adapters: readonly ConnectorTransferAdapter[]) {
  const registered = new Map(adapters.map(adapter => [adapter.applicationSlug, adapter]));
  if (registered.size !== adapters.length) throw new Error("connector_transfer_duplicate_adapter");
  const resolve = (tool: ConnectorTransferTool, parameters: unknown) => {
    const app = getAppDefinitionForApplicationKey(tool.applicationKey);
    const adapter = app ? registered.get(app.slug) : undefined;
    return adapter?.supports(tool, parameters) ? adapter : undefined;
  };
  return {
    supports: (tool: ConnectorTransferTool, parameters: unknown) => !!resolve(tool, parameters),
    prepare(result: unknown, tool: ConnectorTransferTool, parameters: unknown): PreparedConnectorResult {
      return resolve(tool, parameters)?.prepare(result, tool, parameters) ?? { result };
    },
  };
}

export const connectorTransfers = createConnectorTransferRegistry([]);

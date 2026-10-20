import { Command } from "commander";
import { PaperclipApiClient, ApiRequestError } from "../../client/http.js";
import { publishLocal, publishingApiFromTools, type PublishLocalOptions } from "../../client/notebook-publish.js";
import { addCommonClientOptions, handleCommandError, printOutput, resolveCommandContext, type BaseClientOptions } from "./common.js";

type GatewayTool = { name: string; connectionId?: string; applicationKey?: string; upstreamToolName?: string };
type GatewayApi = Pick<PaperclipApiClient, "post"> & { apiBase: string; runId?: string };
type NotebookPublishOptions = PublishLocalOptions & { connection: string };

/** Runs in the agent's admitted filesystem. Notebook credentials stay in the server vault. */
export async function publishNotebookFromRun(api: GatewayApi, options: NotebookPublishOptions, fetcher: typeof fetch = fetch) {
  if (!api.runId) throw new Error("Notebook local publication requires an active agent run. Set PAPERCLIP_RUN_ID or --run-id.");
  const session = await api.post<{ sessionId: string; token: string }>("/api/tool-gateway/sessions", { ttlMs: 15 * 60_000 });
  if (!session?.sessionId || !session.token) throw new Error("Paperclip could not open a tool gateway session.");
  let awaitingApproval = false;
  try {
    const gateway = new PaperclipApiClient({ apiBase: api.apiBase, headers: { "x-paperclip-tool-gateway-token": session.token }, redirect: "error" });
    const tools = await gateway.get<GatewayTool[]>("/api/tool-gateway/tools");
    const selected = tools?.filter(tool => tool.connectionId === options.connection && tool.applicationKey === "paperclip-notebook") ?? [];
    const byName = new Map(selected.map(tool => [tool.upstreamToolName, tool.name]));
    for (const name of ["notebook_create_page", "notebook_begin_upload", "notebook_finalize_upload"]) {
      if ((!options.pageId || name !== "notebook_create_page") && !byName.has(name))
        throw new Error("The selected Notebook connection is unavailable or does not permit local publication. Check agent assignment and action permissions.");
    }
    const publishing = publishingApiFromTools({ async callTool(input) {
      const tool = byName.get(input.name);
      if (!tool) throw new Error("Notebook publication tool is unavailable on the selected connection.");
      const result = await gateway.post<{ status: string; result?: unknown }>("/api/tool-gateway/tools/call", {
        tool, parameters: input.arguments,
        idempotencyKey: `notebook:${options.connection}:${String(input.arguments.idempotencyKey)}`,
      });
      if (!result || !["completed", "replayed"].includes(result.status)) throw new Error("Notebook publication has not completed. Inspect the tool action before continuing.");
      return result.result;
    } });
    return await publishLocal(publishing, options, fetcher);
  } catch (error) {
    // The normal gateway posts a human approval card and executes the approved
    // action automatically. Retain its bounded session until that action settles.
    awaitingApproval = error instanceof ApiRequestError && !!error.body && typeof error.body === "object"
      && "reasonCode" in error.body && error.body.reasonCode === "approval_required";
    if (awaitingApproval && error instanceof ApiRequestError) error.details = error.body;
    throw error;
  } finally {
    if (!awaitingApproval) await api.post(`/api/tool-gateway/sessions/${encodeURIComponent(session.sessionId)}/revoke`, {}).catch(() => undefined);
  }
}

export function registerNotebookCommands(program: Command) {
  const notebook = program.command("notebook").description("Publish local files through an assigned Paperclip Notebook connection");
  addCommonClientOptions(notebook.command("publish").argument("<source>", "Local file or built directory in this agent's approved filesystem")
    .requiredOption("--connection <id>", "Selected Paperclip Notebook connection ID")
    .requiredOption("--idempotency-key <key>", "Stable request key; reuse only for the same files and publication settings")
    .option("--title <title>", "Title for a new page")
    .option("--description <text>", "Description for a new page")
    .option("--page-id <id>", "Update an existing owned page")
    .option("--expected-version <number>", "Current page version when updating", Number)
    .option("--entry-file <path>", "Entry file relative to the selected source")
    .option("--spa", "Use SPA fallback for document navigations"))
    .addHelpText("after", "\nBuild first. This command uses the current run's assigned connection and normal Allowed / Ask first / Off controls. It does not sign in to Notebook or export OAuth credentials. When approval is requested, stop and wait for the task's approval result; continue with the same idempotency key after approval.\n")
    .action(async (source: string, options: BaseClientOptions & Omit<NotebookPublishOptions, "source"> & { spa?: boolean }) => {
      try {
        const context = resolveCommandContext(options);
        const result = await publishNotebookFromRun(context.api, { ...options, source, routing: options.spa ? "spa" : "static" });
        printOutput(result, { json: context.json });
      } catch (error) { handleCommandError(error); }
    });
}

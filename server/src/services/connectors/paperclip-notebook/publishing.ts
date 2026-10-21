import { createHash } from "node:crypto";
import { z } from "zod";
import { notebookPublicationClient } from "./publication-client.js";
import type { createAssignedMcpTools } from "../../native-runtime/assigned-mcp-tools.js";
import type { RemoteWorkspaceFileReader } from "../../native-runtime/native-runner-file-handoff.js";
import { assertRunnerWorkspacePathAllowed, readWorkspaceUploadFile } from "../../native-runtime/runner-bridge-tools.js";
import { guardedRemoteHttpFetch } from "../../remote-http-fetch.js";

const MAX_BYTES = 25 * 1024 * 1024;
const path = z.string().min(1).max(1000).refine(value => !/^[a-z]+:|[\\\x00-\x1f\x7f?#%]/i.test(value)
  && value.split("/").every(part => part && part !== "." && part !== "..") && !value.split("/").some(part => part === "__nb" || part.startsWith("__notebook")) && !value.startsWith(".well-known/"), "Use a canonical workspace-relative file path");
export const notebookPublicationSchema = z.object({
  connectionId: z.string().min(1).max(200), idempotencyKey: z.string().min(1).max(160),
  title: z.string().trim().min(1).max(200).optional(), description: z.string().max(2000).optional(),
  pageId: z.string().uuid().optional(), expectedVersion: z.number().int().positive().optional(),
  entryFile: path, spa: z.boolean().default(false),
  files: z.array(z.object({ path, source: path, size: z.number().int().min(0).max(MAX_BYTES), sha256: z.string().regex(/^[a-f0-9]{64}$/) }).strict()).min(1).max(200),
}).strict();
export const NOTEBOOK_PUBLISH_TOOL = {
  name: "publish_notebook_files",
  description: "Publish files from this run's approved workspace through a selected Paperclip Notebook connection. Build first; use your approved file tools to collect each workspace-relative source, destination path, byte size and SHA-256. Each Notebook action uses the connection's normal permissions and approval flow. Reuse the idempotency key only for the same files/settings. The result is a publication operation; only a ready result includes a working link. No Notebook token or upload ticket is returned.",
  inputSchema: z.toJSONSchema(notebookPublicationSchema),
};
type AssignedTools = Awaited<ReturnType<typeof createAssignedMcpTools>>;
type UploadPlan = { deploymentId: string; status?: string; uploads?: { path: string; url: string; headers?: Record<string, string> }[] };

export async function publishNotebookWorkspaceFiles(input: {
  arguments: unknown; tools: AssignedTools; workspaceRoot: string; executionTargetKind?: "local" | "remote";
  readRemoteWorkspaceFile?: RemoteWorkspaceFileReader; authorize: () => Promise<void>;
  upload?: (url: URL, init: RequestInit) => Promise<Response>;
}) {
  const args = notebookPublicationSchema.parse(input.arguments);
  if (args.pageId && args.expectedVersion === undefined) throw new Error("notebook_expected_version_required");
  if (new Set(args.files.map(file => file.path)).size !== args.files.length || !args.files.some(file => file.path === args.entryFile)
    || args.files.reduce((sum, file) => sum + file.size, 0) > MAX_BYTES) throw new Error("notebook_manifest_invalid");
  const client = notebookPublicationClient(input.tools);
  await client.assertAvailable(args.connectionId);
  for (const file of args.files) assertRunnerWorkspacePathAllowed(file.source);
  const call = async <T>(name: string, parameters: Record<string, unknown>): Promise<T> => {
    await input.authorize();
    return await client.call(args.connectionId, name, parameters) as T;
  };
  const read = async (file: typeof args.files[number]) => {
    await input.authorize();
    const bytes = input.executionTargetKind === "remote"
      ? await (input.readRemoteWorkspaceFile ?? (() => { throw new Error("notebook_remote_workspace_unavailable"); }))({ contentRef: file.source, byteSize: file.size, sha256: file.sha256, allowEmpty: true, maxBytes: MAX_BYTES })
      : await readWorkspaceUploadFile(input.workspaceRoot, file.source, file.size);
    if (bytes.length !== file.size || createHash("sha256").update(bytes).digest("hex") !== file.sha256) throw new Error("notebook_workspace_file_changed");
    await input.authorize(); return bytes;
  };
  for (const file of args.files) await read(file);
  const page = args.pageId ? { id: args.pageId, version: args.expectedVersion! }
    : await call<{ id: string; version: number }>("notebook_create_page", { title: args.title ?? args.entryFile,
      ...(args.description ? { description: args.description } : {}), idempotencyKey: `${args.idempotencyKey}:page` });
  const plan = await call<UploadPlan>("notebook_begin_upload", { pageId: page.id, expectedVersion: page.version,
    assets: args.files.map(({ source: _source, ...file }) => file), entryFile: args.entryFile, spa: args.spa, idempotencyKey: `${args.idempotencyKey}:upload` });
  if (!plan.deploymentId) throw new Error("notebook_upload_plan_invalid");
  if (!plan.status || plan.status === "uploading") {
    if (plan.uploads?.length !== args.files.length || new Set(plan.uploads.map(ticket => ticket.path)).size !== args.files.length) throw new Error("notebook_upload_plan_invalid");
    const files = new Map(args.files.map(file => [file.path, file]));
    for (const ticket of plan.uploads) {
      const file = files.get(ticket.path); if (!file) throw new Error("notebook_upload_plan_invalid");
      let url: URL;
      try { url = new URL(ticket.url); } catch { throw new Error("notebook_upload_plan_invalid"); }
      if (url.protocol !== "https:" || url.username || url.password) throw new Error("notebook_upload_plan_invalid");
      const body = await read(file);
      const send = input.upload ?? ((url: URL, init: RequestInit) => guardedRemoteHttpFetch(url, init, {
        allowPrivateNetwork: false, error: () => new Error("notebook_upload_destination_denied"),
      }));
      await input.authorize();
      const response = await send(url, { method: "PUT", headers: ticket.headers ?? {}, body: new Uint8Array(body),
        signal: AbortSignal.timeout(30_000), redirect: "error", credentials: "omit" });
      await response.body?.cancel();
      if (!response.ok) throw new Error(`Notebook upload failed (${response.status}). Retry with the same idempotency key.`);
    }
  }
  return call("notebook_finalize_upload", { deploymentId: plan.deploymentId, idempotencyKey: `${args.idempotencyKey}:finalize` });
}

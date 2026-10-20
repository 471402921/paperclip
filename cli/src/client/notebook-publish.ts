import { constants } from "node:fs";
import { lstat, open, readdir, realpath } from "node:fs/promises";
import { basename, extname, join, relative, resolve, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";

export interface ManifestFile {
  path: string;
  size: number;
  sha256: string;
  contentType: string;
}
export interface LocalFile extends ManifestFile {
  source: string;
}
export interface UploadTicket {
  path: string;
  url: string;
  method?: "PUT";
  headers?: Record<string, string>;
}
export interface UploadPlan {
  deploymentId: string;
  uploads: UploadTicket[];
  status?: string;
  operationId?: string;
}
export interface PublishOperation {
  id?: string;
  operationId?: string;
  status?: string;
  [key: string]: unknown;
}
export interface NotebookPublishingApi {
  createPage(input: {
    title: string;
    description?: string;
    idempotencyKey: string;
  }): Promise<{ id: string; version: number }>;
  beginUpload(input: {
    pageId: string;
    expectedVersion: number;
    assets: Omit<ManifestFile, "contentType">[];
    entryFile: string;
    spa: boolean;
    idempotencyKey: string;
  }): Promise<UploadPlan>;
  finalizeUpload(input: {
    deploymentId: string;
    idempotencyKey: string;
  }): Promise<PublishOperation>;
}
export interface PublishLocalOptions {
  source: string;
  pageId?: string;
  expectedVersion?: number;
  title?: string;
  description?: string;
  entryFile?: string;
  routing?: "static" | "spa";
  idempotencyKey?: string;
  signal?: AbortSignal;
  /** Local HTTP upload fixtures only. Production upload tickets must use HTTPS. */
  allowLoopbackUploads?: boolean;
}
export interface LocalPublishResult {
  pageId: string;
  deploymentId: string;
  operation: PublishOperation;
}
export const MAX_DEPLOYMENT_BYTES = 25 * 1024 * 1024;
export const MAX_DEPLOYMENT_FILES = 200;
const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".htm": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".pdf": "application/pdf",
  ".zip": "application/zip",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".mp3": "audio/mpeg",
  ".wasm": "application/wasm",
};
export function canonicalFilePath(value: string): string {
  if (
    !value ||
    value.startsWith("/") ||
    /[\\\u0000-\u001f\u007f?#%]/.test(value) ||
    value
      .split("/")
      .some((segment) => !segment || segment === "." || segment === "..")
  )
    throw new Error("File paths must be canonical relative paths.");
  if (
    value
      .split("/")
      .some(
        (segment) => segment.startsWith("__notebook") || segment === "__nb",
      ) ||
    value.startsWith(".well-known/")
  )
    throw new Error("That file path is reserved by Notebook.");
  if (Buffer.byteLength(value, "utf8") > 1024)
    throw new Error("File paths must be at most 1024 bytes.");
  return value;
}
function digest(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Reads only the selected local file/directory. Symbolic links are never followed. */
export async function collectLocalFiles(source: string): Promise<LocalFile[]> {
  const absolute = resolve(source);
  const info = await lstat(absolute);
  if (info.isSymbolicLink())
    throw new Error("Notebook publications cannot contain symbolic links.");
  if (!info.isFile() && !info.isDirectory())
    throw new Error("Choose a regular file or directory to publish.");
  const root = info.isDirectory() ? absolute : resolve(absolute, "..");
  const files: LocalFile[] = [];
  let total = 0;
  async function walk(path: string): Promise<void> {
    const entry = await lstat(path);
    if (entry.isSymbolicLink())
      throw new Error("Notebook publications cannot contain symbolic links.");
    if (entry.isDirectory()) {
      const children = await readdir(path);
      for (const child of children.sort()) await walk(join(path, child));
      return;
    }
    if (!entry.isFile())
      throw new Error("Notebook publications support regular files only.");
    if (files.length >= MAX_DEPLOYMENT_FILES)
      throw new Error(
        `A publication can contain at most ${MAX_DEPLOYMENT_FILES} files.`,
      );
    total += entry.size;
    if (total > MAX_DEPLOYMENT_BYTES)
      throw new Error("A publication can contain at most 25 MiB.");
    const filePath = canonicalFilePath(
      relative(root, path).split(sep).join("/"),
    );
    const bytes = await readRegularFile(path, root);
    if (bytes.length !== entry.size)
      throw new Error(
        "A file changed while preparing the publication. Try again.",
      );
    files.push({
      source: path,
      path: filePath,
      size: bytes.length,
      sha256: digest(bytes),
      contentType:
        MIME[extname(path).toLowerCase()] ?? "application/octet-stream",
    });
  }
  await walk(absolute);
  if (!files.length)
    throw new Error("The selected directory has no files to publish.");
  return files;
}
async function readRegularFile(path: string, root: string): Promise<Buffer> {
  const [actual, actualRoot] = await Promise.all([
    realpath(path),
    realpath(root),
  ]);
  if (actual !== actualRoot && !actual.startsWith(actualRoot + sep))
    throw new Error(
      "Publication files must remain inside the selected directory.",
    );
  const handle = await open(path, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    const stat = await handle.stat();
    if (!stat.isFile() || stat.size > MAX_DEPLOYMENT_BYTES)
      throw new Error(
        "Publication files must be regular files within the deployment limit.",
      );
    return await handle.readFile();
  } finally {
    await handle.close();
  }
}

/**
 * Uses an already-authorized Notebook connection. Tokens remain owned by the
 * caller's credential vault; this helper neither stores nor asks for them.
 */
export async function publishLocal(
  api: NotebookPublishingApi,
  options: PublishLocalOptions,
  fetcher: typeof fetch = fetch,
): Promise<LocalPublishResult> {
  options.signal?.throwIfAborted();
  if (options.pageId && options.expectedVersion === undefined)
    throw new Error("Updating a page requires its current expectedVersion.");
  const files = await collectLocalFiles(options.source);
  const entryFile =
    options.entryFile ??
    (files.some((file) => file.path === "index.html")
      ? "index.html"
      : files.length === 1
        ? files[0]!.path
        : undefined);
  if (
    entryFile &&
    !files.some((file) => file.path === canonicalFilePath(entryFile))
  )
    throw new Error("The entry file is not part of the publication.");
  if (!entryFile) throw new Error("Choose an entry file for this publication.");
  const idempotencyKey = options.idempotencyKey ?? randomUUID();
  const page = options.pageId
    ? { id: options.pageId, version: options.expectedVersion! }
    : await api.createPage({
        title: options.title ?? basename(resolve(options.source)),
        ...(options.description ? { description: options.description } : {}),
        idempotencyKey: `${idempotencyKey}:page`,
      });
  const manifest = files.map(
    ({ source: _source, contentType: _contentType, ...file }) => file,
  );
  const plan = await api.beginUpload({
    pageId: page.id,
    expectedVersion: page.version,
    assets: manifest,
    entryFile,
    spa: options.routing === "spa",
    idempotencyKey: `${idempotencyKey}:upload`,
  });
  if (plan.deploymentId && plan.status && plan.status !== "uploading") {
    const operation = await api.finalizeUpload({
      deploymentId: plan.deploymentId,
      idempotencyKey: `${idempotencyKey}:finalize`,
    });
    return { pageId: page.id, deploymentId: plan.deploymentId, operation };
  }
  if (
    !plan.deploymentId ||
    plan.uploads.length !== files.length ||
    new Set(plan.uploads.map((ticket) => ticket.path)).size !== files.length
  )
    throw new Error("Notebook returned an incomplete upload plan.");
  const fileMap = new Map(files.map((file) => [file.path, file]));
  for (const ticket of plan.uploads) {
    options.signal?.throwIfAborted();
    const file = fileMap.get(ticket.path);
    if (!file)
      throw new Error(
        "Notebook returned an upload ticket for an unexpected file.",
      );
    const url = new URL(ticket.url);
    const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    if (
      url.protocol !== "https:" &&
      !(options.allowLoopbackUploads && url.protocol === "http:" && loopback)
    )
      throw new Error("Upload tickets must use HTTPS.");
    if (
      url.username ||
      url.password ||
      (ticket.method && ticket.method !== "PUT")
    )
      throw new Error("Notebook returned an invalid upload ticket.");
    const root =
      files.length === 1 && (await lstat(resolve(options.source))).isFile()
        ? resolve(file.source, "..")
        : resolve(options.source);
    const bytes = await readRegularFile(file.source, root);
    if (bytes.length !== file.size || digest(bytes) !== file.sha256)
      throw new Error(
        "A file changed after preparing the manifest. Start a new publication.",
      );
    const response = await fetcher(url, {
      method: "PUT",
      headers: ticket.headers ?? { "Content-Type": file.contentType },
      body: new Uint8Array(bytes),
      signal: options.signal,
      redirect: "error",
      credentials: "omit",
    });
    if (!response.ok)
      throw new Error(
        `An upload failed (${response.status}). Retry the publication with the same idempotency key.`,
      );
  }
  options.signal?.throwIfAborted();
  const operation = await api.finalizeUpload({
    deploymentId: plan.deploymentId,
    idempotencyKey: `${idempotencyKey}:finalize`,
  });
  return { pageId: page.id, deploymentId: plan.deploymentId, operation };
}

export interface ToolCaller {
  callTool(input: {
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<unknown>;
}
/** Adapts an authenticated MCP client (including Paperclip's connection gateway). */
export function publishingApiFromTools(
  client: ToolCaller,
): NotebookPublishingApi {
  async function call<T>(name: string, arguments_: object): Promise<T> {
    const response = await client.callTool({
      name,
      arguments: { ...arguments_ },
    });
    if (!response || typeof response !== "object")
      throw new Error("Notebook returned an invalid tool response.");
    const result = response as {
      isError?: boolean;
      structuredContent?: unknown;
      content?: { type: string; text?: string }[];
    };
    if (result.isError)
      throw new Error(
        result.content?.find((content) => content.type === "text")?.text ??
          "Notebook rejected the operation.",
      );
    if (result.structuredContent) return result.structuredContent as T;
    const text = result.content?.find(
      (content) => content.type === "text",
    )?.text;
    if (!text) throw new Error("Notebook returned an empty tool response.");
    return JSON.parse(text) as T;
  }
  return {
    createPage: (input) => call("notebook_create_page", input),
    beginUpload: (input) => call("notebook_begin_upload", input),
    finalizeUpload: (input) => call("notebook_finalize_upload", input),
  };
}

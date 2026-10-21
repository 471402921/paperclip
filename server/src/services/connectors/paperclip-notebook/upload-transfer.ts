import { getAppDefinitionForApplicationKey, isNotebookFilePath } from "@paperclipai/shared";
import type { ConnectorTransferAdapter } from "../private-transfer.js";

type RecordValue = Record<string, unknown>;
export interface NotebookUploadTool {
  providerType?: unknown;
  applicationKey?: unknown;
  connectionId?: unknown;
  upstreamToolName?: unknown;
}
export interface NotebookUploadTickets {
  deploymentId: string;
  uploads: Array<{ path: string; url: string }>;
}

const REDACTED_UPLOAD_URL = "[REDACTED_NOTEBOOK_UPLOAD_URL]";
const MAX_UPLOAD_URLS = 200;
const MAX_URL_LENGTH = 8192;
const MAX_DEPTH = 48;
const MAX_NODES = 20_000;
const MAX_STRING_LENGTH = 2 * 1024 * 1024;
const MAX_RESPONSE_CHARACTERS = 8 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): RecordValue | undefined =>
  value !== null && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : undefined;
const nonempty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

export function isNotebookUploadRequest(tool: NotebookUploadTool, parameters: unknown): boolean {
  if (tool.providerType !== "mcp_remote_http" || getAppDefinitionForApplicationKey(tool.applicationKey)?.slug !== "paperclip-notebook"
    || !nonempty(tool.connectionId)) return false;
  if (tool.upstreamToolName === "notebook_begin_upload") return true;
  const args = record(parameters);
  const receipt = record(args?.receipt);
  return tool.upstreamToolName === "notebook_get_operation" && args?.operationId === undefined
    && receipt?.kind === "begin_upload" && nonempty(receipt.idempotencyKey);
}

function uploadUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_URL_LENGTH
    || !/^https:\/\//i.test(value) || /[\\\x00-\x20\x7f#]/.test(value)
    || /^https:\/\/[^/?#]*@/i.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !!url.hostname && !url.username && !url.password && !url.hash;
  } catch { return false; }
}

function readTickets(value: unknown): NotebookUploadTickets | undefined {
  const plan = record(value);
  if (!plan || typeof plan.deploymentId !== "string" || !UUID.test(plan.deploymentId)
    || !Array.isArray(plan.uploads) || plan.uploads.length > MAX_UPLOAD_URLS) return;
  const uploads: NotebookUploadTickets["uploads"] = [];
  const paths = new Set<string>();
  for (const value of plan.uploads) {
    const ticket = record(value);
    if (!ticket || !isNotebookFilePath(ticket.path) || paths.has(ticket.path) || !uploadUrl(ticket.url)
      || ticket.method !== undefined && ticket.method !== "PUT"
      || ticket.headers !== undefined && (!record(ticket.headers)
        || !Object.values(record(ticket.headers)!).every(header => typeof header === "string"))) return;
    paths.add(ticket.path);
    uploads.push({ path: ticket.path, url: ticket.url });
  }
  return { deploymentId: plan.deploymentId, uploads };
}

function parseJsonContainer(value: string): object | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === "object" ? parsed : undefined;
  } catch { return; }
}

export function prepareNotebookUploadResult<T>(result: T, tool: NotebookUploadTool, parameters: unknown): {
  result: T; uploadTickets?: NotebookUploadTickets;
} {
  if (!isNotebookUploadRequest(tool, parameters)) return { result };
  try {
    return prepareBoundedUploadResult(result);
  } catch {
    return { result: {
      content: "Notebook upload response exceeded transfer limits.",
      error: "Invalid Notebook upload response",
      data: { isError: true, content: [], structuredContent: null },
    } as T };
  }
}

function prepareBoundedUploadResult<T>(result: T): { result: T; uploadTickets?: NotebookUploadTickets } {
  const outer = record(result);
  const data = record(outer?.data);
  const urls = new Set<string>();
  const seen = new WeakSet<object>();
  let nodes = 0;
  let characters = 0;
  const countString = (value: string): void => {
    characters += value.length;
    if (value.length > MAX_STRING_LENGTH || characters > MAX_RESPONSE_CHARACTERS) throw new Error("notebook_upload_response_limit");
  };
  const collect = (value: unknown, depth = 0): void => {
    if (++nodes > MAX_NODES || depth > MAX_DEPTH) throw new Error("notebook_upload_response_limit");
    if (typeof value === "string") {
      countString(value);
      const parsed = parseJsonContainer(value);
      if (parsed) collect(parsed, depth + 1);
      return;
    }
    if (value === null || typeof value !== "object") return;
    if (seen.has(value)) throw new Error("notebook_upload_response_limit");
    seen.add(value);
    if (Array.isArray(value)) {
      if (value.length > MAX_NODES) throw new Error("notebook_upload_response_limit");
      for (const item of value) collect(item, depth + 1);
    } else {
      const object = value as RecordValue;
      if (Array.isArray(object.uploads)) {
        if (object.uploads.length > MAX_NODES) throw new Error("notebook_upload_response_limit");
        for (const item of object.uploads) {
          const url = record(item)?.url;
          if (typeof url === "string" && url.length > 0) {
            if (url.length > MAX_URL_LENGTH) throw new Error("notebook_upload_response_limit");
            urls.add(url);
            if (urls.size > MAX_UPLOAD_URLS) throw new Error("notebook_upload_response_limit");
          }
        }
      }
      for (const key in object) {
        if (!Object.hasOwn(object, key)) continue;
        countString(key);
        collect(object[key], depth + 1);
      }
    }
    seen.delete(value);
  };
  collect(result);
  const uploadTickets = outer?.isError === true || data?.isError === true
    ? undefined : readTickets(data?.structuredContent);
  const replacements = [...new Set([...urls].sort((left, right) => right.length - left.length)
    .flatMap(url => [url, JSON.stringify(url).slice(1, -1), JSON.stringify(url).slice(1, -1).replaceAll("/", "\\/")]))];
  const copies = new WeakMap<object, unknown>();
  const redact = (value: unknown, uploadTicket = false): unknown => {
    if (typeof value === "string") {
      if (uploadTicket) return REDACTED_UPLOAD_URL;
      const parsed = parseJsonContainer(value);
      if (parsed) return JSON.stringify(redact(parsed));
      return replacements.reduce((text, url) => text.replaceAll(url, REDACTED_UPLOAD_URL), value);
    }
    if (value === null || typeof value !== "object") return value;
    if (copies.has(value)) return copies.get(value);
    if (Array.isArray(value)) {
      const copy: unknown[] = []; copies.set(value, copy);
      value.forEach(item => copy.push(redact(item)));
      return copy;
    }
    const copy: RecordValue = {}; copies.set(value, copy);
    for (const [key, item] of Object.entries(value)) {
      Object.defineProperty(copy, key, { enumerable: true, writable: true, configurable: true,
        value: key === "uploads" && Array.isArray(item)
          ? item.map(ticket => {
            const object = record(ticket);
            return object ? Object.fromEntries(Object.entries(object).map(([name, field]) => [name, redact(field, name === "url")])) : redact(ticket);
          }) : redact(item) });
    }
    return copy;
  };
  return { result: redact(result) as T, ...(uploadTickets ? { uploadTickets } : {}) };
}

export function restoreNotebookUploadTickets<T>(result: T, tickets: NotebookUploadTickets): T {
  const validated = readTickets(tickets);
  const outer = record(result);
  const data = record(outer?.data);
  const plan = record(data?.structuredContent);
  if (!validated || !outer || !data || !plan || outer.isError === true || data.isError === true
    || plan.deploymentId !== validated.deploymentId || !Array.isArray(plan.uploads)
    || plan.uploads.length !== validated.uploads.length
    || !plan.uploads.every((ticket, index) => {
      const value = record(ticket);
      return value?.path === validated.uploads[index]?.path && value?.url === REDACTED_UPLOAD_URL;
    })) return result;
  return { ...outer, data: { ...data, structuredContent: { ...plan,
    uploads: plan.uploads.map((ticket, index) => ({ ...record(ticket), url: validated.uploads[index]!.url })),
  } } } as T;
}

export const notebookUploadTransfer: ConnectorTransferAdapter = {
  applicationSlug: "paperclip-notebook",
  supports: isNotebookUploadRequest,
  prepare(result, tool, parameters) {
    const prepared = prepareNotebookUploadResult(result, tool, parameters);
    return { result: prepared.result, ...(prepared.uploadTickets ? {
      privateTransfer: { restore: safe => restoreNotebookUploadTickets(safe, prepared.uploadTickets!) },
    } : {}) };
  },
};

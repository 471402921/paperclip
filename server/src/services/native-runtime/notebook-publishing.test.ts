import { createHash } from "node:crypto";
import { mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { publishNotebookWorkspaceFiles } from "./notebook-publishing.js";
import { createAssignedMcpTools } from "./assigned-mcp-tools.js";
import { ToolGatewayHttpError, type ToolGatewayDescriptor, type ToolGatewayService } from "../tool-gateway.js";
import type { CommandManagedRuntimeRunner } from "@paperclipai/adapter-utils/command-managed-runtime";

const pageId = "44444444-4444-4444-8444-444444444444";
const digest = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
describe("native Notebook workspace publication", () => {
  let root: string, body: Buffer;
  beforeEach(async () => { root = await mkdtemp(join(tmpdir(), "native-notebook-")); body = Buffer.alloc(2 * 1024 * 1024, 65); await writeFile(join(root, "index.html"), body); });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });
  const arguments_ = () => ({ connectionId: "notebook", title: "Report", idempotencyKey: "build-report", entryFile: "index.html",
    files: [{ path: "index.html", source: "index.html", size: body.length, sha256: digest(body) }] });
  async function fixture() {
    const descriptors = ["notebook_create_page", "notebook_begin_upload", "notebook_finalize_upload", "notebook_get_operation"].map(name => ({
      name: `gateway:${name}`, upstreamToolName: name, applicationKey: "app-gallery:paperclip-notebook:44444444-4444-4444-8444-444444444444", connectionId: "notebook", risk: "write",
      displayName: name, description: name, parametersSchema: { type: "object" }, providerType: "mcp_remote_http", pluginId: "fixture",
    } as ToolGatewayDescriptor));
    const uploaded: Buffer[] = [];
    const executeTool = vi.fn(async (call: { tool: string; parameters: any }) => ({ status: "completed", result: { content: "Tool result", data: { structuredContent:
      call.tool.endsWith("notebook_create_page") ? { id: pageId, version: 1 }
      : call.tool.endsWith("notebook_begin_upload") ? { deploymentId: "d", uploads: call.parameters.assets.map((file: { path: string }) => ({ path: file.path, url: `https://quarantine.s3.us-east-1.amazonaws.com/${file.path}?ticket=temporary`, headers: { "x-upload-checksum": digest(body) } })) }
      : { operationId: "d", status: "ready", pageId, shareUrl: "https://notebook.example/p/page", audience: { mode: "private" } } } } }));
    const gateway = { listToolsForNamedGateway: vi.fn().mockResolvedValue(descriptors), executeTool } as unknown as ToolGatewayService;
    const tools = await createAssignedMcpTools({ gateway, gatewayPublicId: "selected-gateway", bearerToken: "controller-only-credential" });
    const authorize = vi.fn(async () => undefined);
    const upload = vi.fn(async (_url: URL, init: RequestInit) => { uploaded.push(Buffer.from(init.body as Uint8Array)); return new Response(null, { status: 200 }); });
    return { tools, gateway, executeTool, authorize, upload, uploaded };
  }
  it("reads real local bytes and sends each action through the selected assigned gateway", async () => {
    const f = await fixture();
    const result = await publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root });
    expect(result).toMatchObject({ status: "ready", audience: { mode: "private" } });
    expect(f.uploaded).toEqual([body]);
    expect(f.executeTool.mock.calls.map(([call]) => call.tool)).toEqual(["gateway:notebook_create_page", "gateway:notebook_begin_upload", "gateway:notebook_finalize_upload"]);
    expect(f.executeTool.mock.calls[1][0]).toMatchObject({ gatewayPublicId: "selected-gateway", sessionToken: "controller-only-credential", notebookUploadTransport: { connectionId: "notebook" }, parameters: { assets: [{ path: "index.html", size: body.length, sha256: digest(body) }] } });
    expect(f.upload.mock.calls[0][1]).toMatchObject({ method: "PUT", headers: { "x-upload-checksum": digest(body) }, redirect: "error", credentials: "omit" });
    expect(JSON.stringify(result)).not.toMatch(/temporary|controller-only|s3\.us-east/);
  });
  it("denies a pinned native helper before reading bytes after Notebook disappears from the current gateway", async () => {
    const f = await fixture(), readRemoteWorkspaceFile = vi.fn();
    vi.mocked(f.gateway.listToolsForNamedGateway).mockResolvedValue([]);
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: "/runtime-only",
      executionTargetKind: "remote", readRemoteWorkspaceFile })).rejects.toThrow("assigned_notebook_tool_unavailable");
    expect(readRemoteWorkspaceFile).not.toHaveBeenCalled();
    expect(f.executeTool).not.toHaveBeenCalled();
    expect(f.upload).not.toHaveBeenCalled();
  });
  it("reads remote bytes only with the existing server-bound reader", async () => {
    const f = await fixture(), readRemoteWorkspaceFile = vi.fn(async () => body);
    await publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: "/not-controller-workspace", executionTargetKind: "remote", readRemoteWorkspaceFile });
    expect(readRemoteWorkspaceFile).toHaveBeenCalledTimes(2);
    expect(readRemoteWorkspaceFile).toHaveBeenCalledWith({ contentRef: "index.html", byteSize: body.length, sha256: digest(body), allowEmpty: true, maxBytes: 25 * 1024 * 1024 });
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root, executionTargetKind: "remote" })).rejects.toThrow("remote_workspace_unavailable");
  });
  it("uses intact replayed results when the status action is unavailable", async () => {
    const f = await fixture();
    const execute = f.executeTool.getMockImplementation()!;
    f.executeTool.mockImplementation(async call => ({ ...await execute(call), status: "replayed" }));
    const listed = await f.gateway.listToolsForNamedGateway({ gatewayPublicId: "selected-gateway", bearerToken: "controller-only-credential" });
    vi.mocked(f.gateway.listToolsForNamedGateway).mockResolvedValue(listed.filter(tool => tool.upstreamToolName !== "notebook_get_operation"));
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root })).resolves.toMatchObject({ status: "ready" });
    expect(f.executeTool.mock.calls.map(([call]) => call.tool)).toEqual(["gateway:notebook_create_page", "gateway:notebook_begin_upload", "gateway:notebook_finalize_upload"]);
    expect(f.uploaded).toEqual([body]);
  });
  it("rejects aggregate content above 25 MiB before reading or mutating", async () => {
    const f = await fixture(), readRemoteWorkspaceFile = vi.fn();
    const files = ["index.html", "large.bin"].map(path => ({ path, source: path, size: 13 * 1024 * 1024, sha256: digest(body) }));
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: { ...arguments_(), files }, workspaceRoot: root,
      executionTargetKind: "remote", readRemoteWorkspaceFile })).rejects.toThrow("manifest_invalid");
    expect(readRemoteWorkspaceFile).not.toHaveBeenCalled();
    expect(f.executeTool).not.toHaveBeenCalled();
    expect(f.upload).not.toHaveBeenCalled();
  });
  it("rejects an unusable remote capture budget before a page action or remote command", async () => {
    const f = await fixture(), execute = vi.fn<CommandManagedRuntimeRunner["execute"]>();
    vi.stubEnv("PAPERCLIP_ATTACHMENT_MAX_BYTES", "1");
    vi.resetModules();
    try {
      const { readVerifiedRemoteWorkspaceFile } = await import("./remote-deliverable-file.js");
      await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: "/workspace", executionTargetKind: "remote",
        readRemoteWorkspaceFile: file => readVerifiedRemoteWorkspaceFile({ ...file, workspaceRoot: "/workspace", runner: { execute } }),
      })).rejects.toThrow("capture_limit");
      expect(execute).not.toHaveBeenCalled();
      expect(f.executeTool).not.toHaveBeenCalled();
      expect(f.upload).not.toHaveBeenCalled();
    } finally { vi.unstubAllEnvs(); vi.resetModules(); }
  });
  it.each(["approval_required", "policy_deny", "connection_revoked"])("preserves %s and sends no bytes without gateway authorization", async reason => {
    const f = await fixture(), error = new ToolGatewayHttpError(403, "Denied", reason);
    f.executeTool.mockRejectedValue(error);
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root })).rejects.toBe(error);
    expect(f.upload).not.toHaveBeenCalled();
  });
  it("stops without a loop or upload when status approval replay shortened the receipt", async () => {
    const f = await fixture();
    f.executeTool.mockImplementation(async () => ({ status: "replayed", result: "Truncated approved receipt" } as any));
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root }))
      .rejects.toThrow("Set notebook_get_operation to Allowed for this recovery, then retry with the same publication key");
    expect(f.executeTool.mock.calls.map(([call]) => call.tool)).toEqual(["gateway:notebook_create_page", "gateway:notebook_get_operation"]);
    expect(f.upload).not.toHaveBeenCalled();
  });
  it("stops when the run loses authority after upload, before finalization", async () => {
    const f = await fixture(); let revoked = false;
    f.authorize.mockImplementation(async () => { if (revoked) throw new Error("run_revoked"); });
    f.upload.mockImplementation(async () => { revoked = true; return new Response(null, { status: 200 }); });
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root })).rejects.toThrow("run_revoked");
    expect(f.executeTool).toHaveBeenCalledTimes(2);
  });
  it("rejects changed, escaped, instance-state, duplicate, or symbolic-link sources before publication", async () => {
    const f = await fixture();
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: { ...arguments_(), connectionId: "different" }, workspaceRoot: root })).rejects.toThrow("unavailable");
    for (const source of ["../private", "/private", ".paperclip/config.json"]) {
      await expect(publishNotebookWorkspaceFiles({ ...f, arguments: { ...arguments_(), files: [{ ...arguments_().files[0], source }] }, workspaceRoot: root })).rejects.toThrow();
    }
    await symlink(join(root, "index.html"), join(root, "link.html"));
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: { ...arguments_(), files: [{ ...arguments_().files[0], source: "link.html" }] }, workspaceRoot: root })).rejects.toThrow("symlink");
    await writeFile(join(root, "index.html"), "changed");
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: arguments_(), workspaceRoot: root })).rejects.toThrow("file_changed");
    await expect(publishNotebookWorkspaceFiles({ ...f, arguments: { ...arguments_(), files: [arguments_().files[0], arguments_().files[0]] }, workspaceRoot: root })).rejects.toThrow("manifest_invalid");
    expect(f.executeTool).not.toHaveBeenCalled();
  });
});

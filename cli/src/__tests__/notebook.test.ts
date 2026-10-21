import { createServer, type Server } from "node:http";
import { mkdtemp, mkdir, rm, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PaperclipApiClient, ApiRequestError } from "../client/http.js";
import { publishNotebookFromRun } from "../commands/client/notebook.js";
import { collectLocalFiles, publishLocal } from "../client/notebook-publish.js";

const connection = "selected-notebook";
const applicationKey = "app-gallery:paperclip-notebook:44444444-4444-4444-8444-444444444444";
const names = ["notebook_create_page", "notebook_begin_upload", "notebook_finalize_upload"];
const checksum = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
describe("Notebook local publication through the active run gateway", { timeout: 15_000 }, () => {
  let directory: string, server: Server, origin: string;
  let calls: { tool: string; parameters: Record<string, any>; idempotencyKey: string }[];
  let uploads: Map<string, Buffer>, revoked: number, redirectsFollowed: number, mode: "allow" | "off" | "ask" | "wrong-connection" | "redirect" | "receipt-replay" | "intact-replay";
  let failedUploads: number, dropCreateResponse: boolean;
  let receipts: Map<string, unknown>;
  beforeEach(async () => {
    directory = await mkdtemp(join(tmpdir(), "paperclip-notebook-cli-"));
    calls = []; uploads = new Map(); revoked = 0; redirectsFollowed = 0; mode = "allow";
    failedUploads = 0; dropCreateResponse = false; receipts = new Map();
    server = createServer(async (req, res) => {
      const chunks: Buffer[] = [];
      for await (const chunk of req) chunks.push(Buffer.from(chunk));
      const bytes = Buffer.concat(chunks), url = new URL(req.url!, origin);
      const reply = (body: unknown, status = 200) => { res.writeHead(status, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      const completed = (structuredContent: unknown) => ({ status: "completed", result: {
        content: JSON.stringify(structuredContent), data: { content: [], structuredContent, isError: false, transport: "mcp_http", spawnedLocalProcess: false },
      } });
      if (url.pathname === "/redirected") { redirectsFollowed++; reply({}); return; }
      if (url.pathname.startsWith("/upload/")) {
        expect(req.headers.authorization).toBeUndefined();
        expect(req.headers["x-paperclip-tool-gateway-token"]).toBeUndefined();
        expect(req.headers["x-amz-checksum-sha256"]).toBe(checksum(bytes));
        if (failedUploads-- > 0) { reply({}, 503); return; }
        uploads.set(decodeURIComponent(url.pathname.slice(8)), bytes); reply({}); return;
      }
      if (url.pathname === "/api/tool-gateway/sessions") {
        expect(req.headers.authorization).toBe("Bearer current-agent");
        expect(req.headers["x-paperclip-run-id"]).toBe("active-run");
        reply({ sessionId: "short-session", token: "session-only-token" }); return;
      }
      if (url.pathname.endsWith("/revoke")) { revoked++; reply({}); return; }
      expect(req.headers["x-paperclip-tool-gateway-token"]).toBe("session-only-token");
      expect(req.headers.authorization).toBeUndefined();
      if (url.pathname === "/api/tool-gateway/tools") {
        if (mode === "redirect") { res.writeHead(302, { location: `${origin}/redirected` }); res.end(); return; }
        reply([...names, ...(mode === "intact-replay" ? [] : ["notebook_get_operation"])].map(name => ({ name: `gateway:${name}`, upstreamToolName: name, applicationKey, connectionId: mode === "wrong-connection" ? "another-notebook" : connection }))); return;
      }
      if (["/api/tool-gateway/tools/call", "/api/tool-gateway/connector-transfers/call"].includes(url.pathname)) {
        const body = JSON.parse(bytes.toString()); calls.push(body);
        if (url.pathname === "/api/tool-gateway/connector-transfers/call") {
          expect(body.connectionId).toBe(connection);
          expect(body.tool.endsWith("notebook_begin_upload") || body.tool.endsWith("notebook_get_operation")
            && body.parameters.receipt?.kind === "begin_upload").toBe(true);
        } else expect(body.connectionId).toBeUndefined();
        if (mode === "off") { reply({ error: "Tool is disabled", reasonCode: "policy_deny" }, 403); return; }
        if (mode === "ask") { reply({ error: "Tool action requires approval", reasonCode: "approval_required", actionRequestId: "approval-card", instructions: "Stop and wait for the task approval result." }, 409); return; }
        const p = body.parameters;
        if (body.tool.endsWith("notebook_get_operation")) {
          expect(body.idempotencyKey).toBeUndefined();
          if (mode === "receipt-replay" && p.receipt?.kind === "begin_upload") {
            reply({ status: "replayed", result: "Truncated approved upload receipt" }); return;
          }
          const full = p.receipt ? receipts.get(p.receipt.idempotencyKey) : { operationId: "deployment", pageId: "page", status: "validating" };
          reply(completed(full)); return;
        }
        if (receipts.has(p.idempotencyKey)) {
          const summary = JSON.stringify({ structuredContent: receipts.get(p.idempotencyKey) }).slice(0, 4000);
          reply({ status: "replayed", result: { summary, sizeBytes: 30_000 } }); return;
        }
        let result: unknown;
        if (body.tool.endsWith("notebook_create_page")) result = { id: "page", version: 7 };
        else if (body.tool.endsWith("notebook_begin_upload")) {
          result = { deploymentId: "deployment", uploads: p.assets.map((asset: { path: string; sha256: string }) => ({ path: asset.path, url: `${origin}/upload/${encodeURIComponent(asset.path)}?ticket=${"temporary".repeat(600)}`, headers: { "x-amz-checksum-sha256": asset.sha256 } })) };
        } else {
          expect(uploads.size).toBe(2);
          result = { operationId: "deployment", pageId: "page", status: "validating" };
        }
        receipts.set(p.idempotencyKey, result);
        if (body.tool.endsWith("notebook_create_page") && dropCreateResponse) { dropCreateResponse = false; res.destroy(); return; }
        reply({ ...completed(result), status: mode === "intact-replay" ? "replayed" : "completed" }); return;
      }
      reply({}, 404);
    });
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address(); if (!address || typeof address === "string") throw new Error("Missing test listener");
    origin = `http://127.0.0.1:${address.port}`;
    await mkdir(join(directory, "assets"));
    await writeFile(join(directory, "index.html"), "<h1>Report</h1><script src='assets/app.js'></script>");
    await writeFile(join(directory, "assets/app.js"), Buffer.alloc(2 * 1024 * 1024, 65));
  });
  afterEach(async () => { server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); await rm(directory, { recursive: true, force: true }); });
  const options = () => ({ connection, source: directory, title: "Built report", idempotencyKey: "report-2026", allowLoopbackUploads: true });
  const api = () => new PaperclipApiClient({ apiBase: origin, apiKey: "current-agent", runId: "active-run" });

  it("uploads a real 2 MiB bundle without OAuth or gateway credentials on upload requests", async () => {
    const result = await publishNotebookFromRun(api(), options());
    expect(result).toEqual({ pageId: "page", deploymentId: "deployment", operation: { operationId: "deployment", pageId: "page", status: "validating" } });
    expect(JSON.stringify(result)).not.toContain("session-only-token");
    expect(JSON.stringify(result)).not.toContain("/upload/");
    expect(uploads.get("assets/app.js")).toEqual(Buffer.alloc(2 * 1024 * 1024, 65));
    expect(calls.map(call => call.tool)).toEqual(names.map(name => `gateway:${name}`));
    expect(calls[1].parameters).toMatchObject({ pageId: "page", expectedVersion: 7, entryFile: "index.html", spa: false });
    expect(calls[1].parameters.assets.every((file: any) => !file.source && !file.contentType)).toBe(true);
    expect(calls[2].idempotencyKey).toBe(`notebook:${connection}:report-2026:finalize`);
    expect(revoked).toBe(1);
  });
  it("honors Off and does not upload after a gateway denial", async () => {
    mode = "off";
    await expect(publishNotebookFromRun(api(), options())).rejects.toMatchObject({ status: 403 });
    expect(uploads.size).toBe(0); expect(calls).toHaveLength(1); expect(revoked).toBe(1);
  });
  it("uses intact replayed results without requiring an extra status action", async () => {
    mode = "intact-replay";
    await expect(publishNotebookFromRun(api(), options())).resolves.toMatchObject({ pageId: "page", operation: { status: "validating" } });
    expect(calls.map(call => call.tool)).toEqual(names.map(name => `gateway:${name}`));
    expect(uploads.size).toBe(2);
  });
  it("resumes a failed upload with complete owner-scoped receipts instead of shortened audit summaries", async () => {
    failedUploads = 1;
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow("upload failed (503)");
    expect(JSON.stringify(receipts.get("report-2026:upload")).length).toBeGreaterThan(4000);
    await expect(publishNotebookFromRun(api(), options())).resolves.toMatchObject({ pageId: "page", operation: { status: "validating" } });
    const recovered = calls.filter(call => call.tool === "gateway:notebook_get_operation");
    expect(recovered.map(call => call.parameters)).toEqual([
      { receipt: { kind: "create_page", idempotencyKey: "report-2026:page" } },
      { receipt: { kind: "begin_upload", idempotencyKey: "report-2026:upload" } },
    ]);
    expect(uploads.get("assets/app.js")).toEqual(Buffer.alloc(2 * 1024 * 1024, 65));
    expect(uploads.size).toBe(2); expect(revoked).toBe(2);
  });
  it("recovers a committed page after losing its response without adopting a newer page version", async () => {
    dropCreateResponse = true;
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow();
    await expect(publishNotebookFromRun(api(), options())).resolves.toMatchObject({ pageId: "page" });
    expect(calls.find(call => call.tool === "gateway:notebook_get_operation")?.parameters).toEqual({ receipt: { kind: "create_page", idempotencyKey: "report-2026:page" } });
    expect(calls.find(call => call.tool === "gateway:notebook_begin_upload")?.parameters.expectedVersion).toBe(7);
  });
  it("stops safely when status approval replay also shortened the recovery receipt", async () => {
    failedUploads = 1;
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow("upload failed (503)");
    mode = "receipt-replay";
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow("Set notebook_get_operation to Allowed for this recovery, then retry with the same publication key");
    expect(calls.filter(call => call.tool === "gateway:notebook_get_operation")).toHaveLength(2);
    expect(uploads.size).toBe(0); expect(revoked).toBe(2);
  });
  it("preserves Ask first instructions and the bounded session for automatic approval execution", async () => {
    mode = "ask";
    await expect(publishNotebookFromRun(api(), options())).rejects.toMatchObject({ details: { reasonCode: "approval_required", actionRequestId: "approval-card", instructions: expect.stringContaining("Stop and wait") } });
    expect(uploads.size).toBe(0); expect(calls).toHaveLength(1); expect(revoked).toBe(0);
  });
  it("requires the explicitly selected Notebook connection", async () => {
    mode = "wrong-connection";
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow("selected Notebook connection");
    expect(calls).toHaveLength(0); expect(uploads.size).toBe(0); expect(revoked).toBe(1);
  });
  it("requires an active run rather than obtaining Notebook credentials", async () => {
    await expect(publishNotebookFromRun(new PaperclipApiClient({ apiBase: origin }), options())).rejects.toThrow("active agent run");
    expect(revoked).toBe(0);
  });
  it("never forwards the gateway session token through a redirect", async () => {
    mode = "redirect";
    await expect(publishNotebookFromRun(api(), options())).rejects.toThrow("Could not reach the Paperclip API");
    expect(redirectsFollowed).toBe(0); expect(revoked).toBe(1); expect(uploads.size).toBe(0);
  });
  it("rejects local symlinks and changed manifests before finalization", async () => {
    await symlink(join(directory, "index.html"), join(directory, "linked.html"));
    await expect(collectLocalFiles(directory)).rejects.toThrow("symbolic links");
    await rm(join(directory, "linked.html"));
    const fake = { createPage: async () => ({ id: "page", version: 1 }), beginUpload: async () => {
      await writeFile(join(directory, "index.html"), "Changed");
      return { deploymentId: "d", uploads: [{ path: "assets/app.js", url: `${origin}/upload/js` }, { path: "index.html", url: `${origin}/upload/html` }] };
    }, finalizeUpload: async () => { throw new Error("must not finalize"); } };
    await expect(publishLocal(fake, options(), async () => new Response(null, { status: 200 }))).rejects.toThrow("changed after preparing");
  });
});

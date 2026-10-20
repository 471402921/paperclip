import { createHash } from "node:crypto";
import { execFile, spawnSync } from "node:child_process";
import { link, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandManagedRuntimeRunner } from "@paperclipai/adapter-utils/command-managed-runtime";
import { MAX_REMOTE_DELIVERABLE_BYTES, readVerifiedRemoteWorkspaceFile } from "./remote-deliverable-file.js";
import { publishNotebookWorkspaceFiles } from "./notebook-publishing.js";

const digest = (body: Buffer) => createHash("sha256").update(body).digest("hex");
const image = "node:24-bookworm-slim";
const hasLinuxNode = process.platform === "linux" || spawnSync("docker", ["image", "inspect", image], { stdio: "ignore", timeout: 2_000 }).status === 0;
const body = Buffer.from("newsletter checklist\n");
const request = { workspaceRoot: "/workspace", contentRef: "checklist.md", byteSize: body.length, sha256: digest(body) };
const success = { pid: null, startedAt: "2026-09-12T00:00:00Z", exitCode: 0, signal: null, timedOut: false, stdout: body.toString("base64"), stderr: "" };
async function readerForAttachmentLimit(limit: number) {
  vi.stubEnv("PAPERCLIP_ATTACHMENT_MAX_BYTES", String(limit));
  vi.resetModules();
  try { return (await import("./remote-deliverable-file.js")).readVerifiedRemoteWorkspaceFile; }
  finally { vi.unstubAllEnvs(); vi.resetModules(); }
}

describe("remote deliverable admission", () => {
  it.each([
    { contentRef: "../secret" }, { contentRef: "/etc/passwd" }, { contentRef: "file:///etc/passwd" },
    { contentRef: "..\\secret" }, { contentRef: "." }, { contentRef: "x\0y" },
    { workspaceRoot: "relative" }, { byteSize: 0 }, { byteSize: MAX_REMOTE_DELIVERABLE_BYTES + 1 },
    { byteSize: 1.5 }, { sha256: "invalid" },
  ])("rejects invalid input before dispatch: %j", async (override) => {
    const execute = vi.fn();
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, ...override, runner: { execute } })).rejects.toThrow(/paperclip_runner_file_handoff_/);
    expect(execute).not.toHaveBeenCalled();
  });

  it("sanitizes a rejected remote transport error", async () => {
    const execute = vi.fn().mockRejectedValue(new Error("/private/provider/details"));
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, runner: { execute } }))
      .rejects.toThrow("paperclip_runner_file_handoff_remote_read_failed");
  });

  it("permits an empty Notebook file only through the explicit server-owned opt-in", async () => {
    const execute = vi.fn().mockResolvedValue({ ...success, stdout: "" });
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, byteSize: 0, sha256: digest(Buffer.alloc(0)), allowEmpty: true, maxBytes: 25 * 1024 * 1024, runner: { execute } })).resolves.toEqual(Buffer.alloc(0));
    expect(execute).toHaveBeenCalledOnce();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 25 * 1024 * 1024 + 1])("rejects an invalid server byte allowance %j before dispatch", async maxBytes => {
    const execute = vi.fn();
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, maxBytes, runner: { execute } })).rejects.toThrow("size_denied");
    expect(execute).not.toHaveBeenCalled();
  });

  it("keeps the Notebook allowance bounded to 25 MiB before dispatch", async () => {
    const execute = vi.fn();
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, byteSize: 25 * 1024 * 1024 + 1, maxBytes: 25 * 1024 * 1024, runner: { execute } })).rejects.toThrow("size_denied");
    expect(execute).not.toHaveBeenCalled();
  });

  it("preserves an operator-configured ordinary attachment ceiling", async () => {
    vi.stubEnv("PAPERCLIP_ATTACHMENT_MAX_BYTES", String(32 * 1024 * 1024));
    vi.resetModules();
    try {
      const { readVerifiedRemoteWorkspaceFile: read } = await import("./remote-deliverable-file.js");
      const execute = vi.fn().mockResolvedValue({ ...success, timedOut: true });
      const large = { ...request, byteSize: 26 * 1024 * 1024, runner: { execute } };
      await expect(read(large)).rejects.toThrow("remote_read_timeout");
      expect(execute).toHaveBeenCalledOnce();
      execute.mockClear();
      await expect(read({ ...large, maxBytes: 25 * 1024 * 1024 })).rejects.toThrow("size_denied");
      expect(execute).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it.each([1, -1, Number.MAX_VALUE])("rejects an unusable Notebook capture budget %j before dispatch", async ceiling => {
    const read = await readerForAttachmentLimit(ceiling), execute = vi.fn();
    await expect(read({ ...request, byteSize: 1024, maxBytes: 25 * 1024 * 1024, runner: { execute } })).rejects.toThrow("capture_limit");
    expect(execute).not.toHaveBeenCalled();
  });

  it("fits base64 padding at a sub-byte configured capture ceiling", async () => {
    const read = await readerForAttachmentLimit(0.5), execute = vi.fn().mockResolvedValue({ ...success, stdout: "YQ==" });
    await expect(read({ ...request, byteSize: 1, sha256: digest(Buffer.from("a")), maxBytes: 25 * 1024 * 1024, runner: { execute } })).resolves.toEqual(Buffer.from("a"));
  });

  it("bounds a whole Notebook read and each remaining command without waiting for the deadline", async () => {
    let elapsed = 0;
    const clock = vi.spyOn(performance, "now").mockImplementation(() => elapsed);
    const bytes = Buffer.alloc(3 * 1024 * 1024, 65);
    const execute = vi.fn(async (input: Parameters<CommandManagedRuntimeRunner["execute"]>[0]) => {
      elapsed += 119_999;
      const { length } = JSON.parse(input.args!.at(-1)!);
      return { ...success, stdout: Buffer.alloc(length, 65).toString("base64") };
    });
    try {
      await expect(readVerifiedRemoteWorkspaceFile({ ...request, byteSize: bytes.length, sha256: digest(bytes), maxBytes: 25 * 1024 * 1024, runner: { execute } })).rejects.toThrow("remote_read_timeout");
      expect(execute.mock.calls.map(([input]) => input.timeoutMs)).toEqual([10_000, 1]);
    } finally { clock.mockRestore(); }
  });

  it.each([
    { stdout: "" }, { stdout: success.stdout + "\n" }, { stdout: "?".repeat(success.stdout.length) },
    { stdout: Buffer.alloc(body.length, 65).toString("base64") }, { timedOut: true }, { exitCode: 1, stderr: "/private/provider/details" },
  ])("rejects truncated, corrupt, or failed provider output: %j", async (override) => {
    const execute = vi.fn().mockResolvedValue({ ...success, ...override });
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, runner: { execute } })).rejects.toThrow(/paperclip_runner_file_handoff_/);
  });
});

describe.skipIf(!hasLinuxNode)("remote deliverable real Linux descriptor reads", () => {
  let root: string;
  let workspaceRoot: string;
  let preload: string | undefined;
  let captureLimit: number;
  let runner: Pick<CommandManagedRuntimeRunner, "execute">;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), "paperclip-remote-file-")));
    workspaceRoot = join(root, "workspace");
    await mkdir(workspaceRoot);
    await writeFile(join(workspaceRoot, "checklist.md"), body);
    preload = undefined;
    captureLimit = 16 * 1024 * 1024;
    runner = { execute: vi.fn(async (input) => {
      const nodeArgs = [...(preload ? ["--require", preload] : []), ...(input.args ?? [])];
      const command = process.platform === "linux" ? process.execPath : "docker";
      const args = process.platform === "linux" ? nodeArgs : [
        "run", "--rm", "--platform", "linux/amd64", "--network", "none", "--read-only", "--cap-drop", "ALL",
        "-v", `${root}:${root}`, image, "node", ...nodeArgs,
      ];
      return await new Promise<Awaited<ReturnType<CommandManagedRuntimeRunner["execute"]>>>((resolve) => {
        execFile(command, args, { encoding: "utf8", timeout: input.timeoutMs, maxBuffer: captureLimit,
          env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" } }, (error, stdout, stderr) => resolve({
          pid: null, startedAt: new Date().toISOString(), exitCode: error ? 1 : 0,
          signal: null, timedOut: Boolean(error?.killed), stdout, stderr,
        }));
      });
    }) };
  });
  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it("reads verified remote bytes without touching controller paths", async () => {
    const result = await readVerifiedRemoteWorkspaceFile({ ...request, workspaceRoot, runner });
    expect(result).toEqual(body);
    expect(runner.execute).toHaveBeenCalledWith(expect.objectContaining({
      command: "node", timeoutMs: 10_000, bypassSession: true,
      env: { NODE_OPTIONS: "", NODE_PATH: "" },
    }));
    expect(await readFile(join(workspaceRoot, "checklist.md"))).toEqual(body);
  });

  it("reads a real 2 MiB Notebook asset and an explicitly admitted empty file", async () => {
    const bytes = Buffer.alloc(2 * 1024 * 1024, 65);
    await writeFile(join(workspaceRoot, "bundle.js"), bytes);
    await expect(readVerifiedRemoteWorkspaceFile({ workspaceRoot, contentRef: "bundle.js", byteSize: bytes.length, sha256: digest(bytes), runner })).resolves.toEqual(bytes);
    await writeFile(join(workspaceRoot, "empty.txt"), Buffer.alloc(0));
    await expect(readVerifiedRemoteWorkspaceFile({ workspaceRoot, contentRef: "empty.txt", byteSize: 0, sha256: digest(Buffer.alloc(0)), allowEmpty: true, maxBytes: 25 * 1024 * 1024, runner })).resolves.toEqual(Buffer.alloc(0));
  });

  it("passes metacharacters as data, never shell syntax", async () => {
    const contentRef = "draft ' $(touch SHOULD_NOT_EXIST).md";
    await writeFile(join(workspaceRoot, contentRef), body);
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, workspaceRoot, contentRef, runner })).resolves.toEqual(body);
    await expect(readFile(join(workspaceRoot, "SHOULD_NOT_EXIST"))).rejects.toMatchObject({ code: "ENOENT" });
  });

  it.each(["symlink", "parent symlink", "hardlink", "directory", "wrong size", "wrong hash"])("rejects %s without returning file bytes", async (scenario) => {
    let contentRef = "checklist.md";
    const values = { byteSize: body.length, sha256: digest(body) };
    await writeFile(join(root, "outside.md"), body);
    if (scenario === "symlink") { contentRef = "linked.md"; await symlink(join(root, "outside.md"), join(workspaceRoot, contentRef)); }
    if (scenario === "parent symlink") { await symlink(root, join(workspaceRoot, "linked")); contentRef = "linked/outside.md"; }
    if (scenario === "hardlink") { contentRef = "hard.md"; await link(join(root, "outside.md"), join(workspaceRoot, contentRef)); }
    if (scenario === "directory") { contentRef = "directory"; await mkdir(join(workspaceRoot, contentRef)); }
    if (scenario === "wrong size") values.byteSize++;
    if (scenario === "wrong hash") values.sha256 = "0".repeat(64);
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, workspaceRoot, contentRef, runner, ...values })).rejects.toThrow(/paperclip_runner_file_handoff_/);
  });

  it.each(["replace", "grow", "hardlink"])("detects a %s during the descriptor read", async (mutation) => {
    preload = join(root, "mutate.cjs");
    await writeFile(preload, `
      const fs = require('node:fs/promises');
      const originalOpen = fs.open;
      fs.open = async (...args) => {
        const handle = await originalOpen(...args);
        const originalRead = handle.read.bind(handle);
        let changed = false;
        handle.read = async (...readArgs) => {
          const result = await originalRead(...readArgs);
          if (!changed) {
            changed = true;
            const file = args[0];
            if (${JSON.stringify(mutation)} === 'replace') { await fs.rename(file, file + '.old'); await fs.writeFile(file, Buffer.from(${JSON.stringify(body.toString("base64"))}, 'base64')); }
            if (${JSON.stringify(mutation)} === 'grow') await fs.appendFile(file, 'more');
            if (${JSON.stringify(mutation)} === 'hardlink') await fs.link(file, file + '.link');
          }
          return result;
        };
        return handle;
      };
    `);
    await expect(readVerifiedRemoteWorkspaceFile({ ...request, workspaceRoot, runner })).rejects.toThrow(/paperclip_runner_file_handoff_file_changed/);
  });

  it("accepts the 10 MiB limit with exact bytes and hash", async () => {
    const maximum = Buffer.alloc(MAX_REMOTE_DELIVERABLE_BYTES, 37);
    await writeFile(join(workspaceRoot, "maximum.bin"), maximum);
    const result = await readVerifiedRemoteWorkspaceFile({ runner, workspaceRoot, contentRef: "maximum.bin", byteSize: maximum.length, sha256: digest(maximum) });
    expect(result.equals(maximum)).toBe(true);
  }, 20_000);

  it.each([{ sizeMiB: 12, attachmentMiB: 10 }, { sizeMiB: 12, attachmentMiB: 1 }])("publishes a remote Notebook asset without raising command capture limits: %j", async ({ sizeMiB, attachmentMiB }) => {
    let reader = readVerifiedRemoteWorkspaceFile;
    if (attachmentMiB !== 10) {
      reader = await readerForAttachmentLimit(attachmentMiB * 1024 * 1024);
    }
    captureLimit = Math.min(4 * 1024 * 1024, 4 * Math.ceil(attachmentMiB * 1024 * 1024 / 3));
    const maximum = Buffer.alloc(sizeMiB * 1024 * 1024, 39);
    await writeFile(join(workspaceRoot, "report.html"), maximum);
    const executeNotebookTool = vi.fn(async (_connection: string, name: string) => name === "notebook_create_page" ? { id: "page", version: 1 }
      : name === "notebook_begin_upload" ? { deploymentId: "deployment", uploads: [{ path: "report.html", url: "https://quarantine.example/report" }] }
      : { operationId: "deployment", status: "ready" });
    const tools = { notebookConnectionIds: () => ["notebook"], assertNotebookConnectionAvailable: async () => undefined, executeNotebookTool } as unknown as Parameters<typeof publishNotebookWorkspaceFiles>[0]["tools"];
    const upload = vi.fn(async (_url: URL, init: RequestInit) => {
      expect(Buffer.from(init.body as Uint8Array).equals(maximum)).toBe(true);
      return new Response(null, { status: 200 });
    });
    const read = { contentRef: "report.html", byteSize: maximum.length, sha256: digest(maximum) };
    await expect(reader({ runner, workspaceRoot, ...read })).rejects.toThrow("size_denied");
    expect(runner.execute).not.toHaveBeenCalled();
    await expect(publishNotebookWorkspaceFiles({ tools, upload, authorize: async () => undefined, workspaceRoot,
      executionTargetKind: "remote", readRemoteWorkspaceFile: file => reader({ runner, workspaceRoot, ...file }),
      arguments: { connectionId: "notebook", idempotencyKey: "large-remote", entryFile: "report.html",
        files: [{ path: "report.html", source: read.contentRef, size: read.byteSize, sha256: read.sha256 }] },
    })).resolves.toMatchObject({ status: "ready" });
    expect(upload).toHaveBeenCalledOnce();
    expect(executeNotebookTool.mock.calls.map(([, name]) => name)).toEqual(["notebook_create_page", "notebook_begin_upload", "notebook_finalize_upload"]);
    expect(runner.execute).toHaveBeenCalledTimes(2 * Math.ceil(sizeMiB / Math.min(2, attachmentMiB)));
  }, 60_000);

  it.each([10, 1])("reads the exact 25 MiB Notebook ceiling at a configured %i MiB capture ceiling", async attachmentMiB => {
    const reader = attachmentMiB === 10 ? readVerifiedRemoteWorkspaceFile : await readerForAttachmentLimit(attachmentMiB * 1024 * 1024);
    captureLimit = Math.min(4 * 1024 * 1024, 4 * Math.ceil(attachmentMiB * 1024 * 1024 / 3));
    const maximum = Buffer.alloc(25 * 1024 * 1024, 41);
    await writeFile(join(workspaceRoot, "maximum.bin"), maximum);
    const result = await reader({ runner, workspaceRoot, contentRef: "maximum.bin", byteSize: maximum.length, sha256: digest(maximum), maxBytes: maximum.length });
    expect(result.equals(maximum)).toBe(true);
    expect(runner.execute).toHaveBeenCalledTimes(Math.ceil(25 / Math.min(2, attachmentMiB)));
    for (const [input] of vi.mocked(runner.execute).mock.calls) {
      const payload = JSON.parse(input.args!.at(-1)!);
      expect(payload.length).toBeLessThanOrEqual(Math.min(2, attachmentMiB) * 1024 * 1024);
    }
  }, 60_000);

  it("rejects a Notebook file replaced between chunk reads before returning bytes", async () => {
    captureLimit = 4 * 1024 * 1024;
    const maximum = Buffer.alloc(3 * 1024 * 1024, 43);
    await writeFile(join(workspaceRoot, "changing.bin"), maximum);
    const execute = runner.execute;
    const changingRunner = { execute: vi.fn(async (input: Parameters<CommandManagedRuntimeRunner["execute"]>[0]) => {
      const result = await execute(input);
      if (JSON.parse(input.args!.at(-1)!).offset === 0) {
        await rm(join(workspaceRoot, "changing.bin"));
        await writeFile(join(workspaceRoot, "changing.bin"), Buffer.alloc(maximum.length, 47));
      }
      return result;
    }) };
    await expect(readVerifiedRemoteWorkspaceFile({ runner: changingRunner, workspaceRoot, contentRef: "changing.bin", byteSize: maximum.length, sha256: digest(maximum), maxBytes: 25 * 1024 * 1024 })).rejects.toThrow("hash_mismatch");
  }, 30_000);
});

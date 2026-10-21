import { appendFile, mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { collectLocalFiles, MAX_DEPLOYMENT_BYTES } from "../client/notebook-publish.js";

vi.mock("node:fs/promises", async importOriginal => {
  const actual = await importOriginal<typeof import("node:fs/promises")>();
  return { ...actual, open: vi.fn(actual.open) };
});

describe("Notebook local file bounds", () => {
  let directory: string;
  beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "notebook-local-bound-")); });
  afterEach(async () => { vi.clearAllMocks(); await rm(directory, { recursive: true, force: true }); });

  it("bounds descriptor reads when a real file grows beyond 25 MiB after stat", async () => {
    const path = join(directory, "index.html");
    await writeFile(path, Buffer.alloc(MAX_DEPLOYMENT_BYTES, 65));
    const actual = await vi.importActual<typeof import("node:fs/promises")>("node:fs/promises");
    let bytesRead = 0;
    vi.mocked(open).mockImplementationOnce(async (...args) => {
      const handle = await actual.open(...args);
      return new Proxy(handle, { get(target, key) {
        if (key === "stat") return async () => {
          const stat = await target.stat();
          await appendFile(path, Buffer.alloc(1024 * 1024, 66));
          return stat;
        };
        if (key === "readFile") return async () => {
          const bytes = await target.readFile(); bytesRead += bytes.length; return bytes;
        };
        if (key === "read") return async (buffer: Buffer, offset: number, length: number, position: number) => {
          expect(buffer.length).toBeLessThanOrEqual(MAX_DEPLOYMENT_BYTES + 1);
          const result = await target.read(buffer, offset, length, position);
          bytesRead += result.bytesRead; return result;
        };
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      } });
    });
    await expect(collectLocalFiles(path)).rejects.toThrow();
    expect(bytesRead).toBeGreaterThan(0);
    expect(bytesRead).toBeLessThanOrEqual(MAX_DEPLOYMENT_BYTES + 1);
  });

  it("preserves exact bytes and checksum at the 25 MiB ceiling", async () => {
    const path = join(directory, "index.html"), bytes = Buffer.alloc(MAX_DEPLOYMENT_BYTES, 67);
    await writeFile(path, bytes);
    await expect(collectLocalFiles(path)).resolves.toEqual([{ source: path, path: "index.html", size: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"), contentType: "text/html; charset=utf-8" }]);
  });
});

const linuxImage = "node:24-bookworm-slim";
const hasLinuxNode = process.platform === "linux" || spawnSync("docker", ["image", "inspect", linuxImage], { stdio: "ignore", timeout: 2_000 }).status === 0;
describe.skipIf(!hasLinuxNode)("Notebook CLI real Linux path boundaries", () => {
  let bundleDirectory: string, bundlePath: string;
  beforeAll(async () => {
    bundleDirectory = await mkdtemp(join(tmpdir(), "notebook-path-publisher-"));
    bundlePath = join(bundleDirectory, "publisher.mjs");
    await build({ entryPoints: [fileURLToPath(new URL("../client/notebook-publish.ts", import.meta.url))],
      outfile: bundlePath, bundle: true, platform: "node", format: "esm", target: "node24" });
  });
  afterAll(async () => { await rm(bundleDirectory, { recursive: true, force: true }); });
  it.each([
    { label: "ASCII at 1024 bytes", path: `${`${"a".repeat(63)}/`.repeat(15)}${"b".repeat(64)}`, allowed: true },
    { label: "ASCII at 1025 bytes", path: `${`${"a".repeat(63)}/`.repeat(15)}${"b".repeat(65)}`, allowed: false },
    { label: "UTF-8 at 1024 bytes", path: `${`${"é".repeat(31)}/`.repeat(16)}${"é".repeat(8)}`, allowed: true },
    { label: "UTF-8 at 1025 bytes", path: `${`${"é".repeat(31)}/`.repeat(16)}${"é".repeat(8)}b`, allowed: false },
  ])("validates real nested files before any page mutation: $label", async ({ path, allowed }) => {
    const program = `
      import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
      import { dirname, join } from 'node:path';
      import { tmpdir } from 'node:os';
      const { path, bundle, scratch } = JSON.parse(process.argv[1]);
      const { publishLocal } = await import(bundle);
      const directory = await mkdtemp(join(scratch ?? tmpdir(), 'notebook-file-path-'));
      const calls = [], uploaded = [];
      try {
        const file = join(directory, path);
        await mkdir(dirname(file), { recursive: true });
        await writeFile(file, 'boundary bytes');
        const api = {
          createPage: async () => { calls.push('create'); return { id: 'page', version: 1 }; },
          beginUpload: async input => { calls.push('begin'); return { deploymentId: 'deployment',
            uploads: input.assets.map(asset => ({ path: asset.path, url: 'http://127.0.0.1:1/upload' })) }; },
          finalizeUpload: async () => { calls.push('finalize'); return { status: 'ready' }; },
        };
        try {
          const result = await publishLocal(api, { source: directory, entryFile: path, allowLoopbackUploads: true },
            async (_url, init) => { uploaded.push(Buffer.from(init.body).toString()); return new Response(null, { status: 200 }); });
          console.log(JSON.stringify({ calls, uploaded, status: result.operation.status }));
        } catch (error) { console.log(JSON.stringify({ calls, uploaded, error: error.message })); }
      } finally { await rm(directory, { recursive: true, force: true }); }
    `;
    const payload = JSON.stringify({ path, bundle: bundlePath, scratch: process.platform === "linux" ? undefined : "/scratch" });
    const command = process.platform === "linux" ? process.execPath : "docker";
    const args = process.platform === "linux" ? ["--input-type=module", "-e", program, payload] : [
      "run", "--rm", "--pull=never", "--platform", "linux/amd64", "--network", "none", "--read-only", "--cap-drop", "ALL",
      "--tmpfs", "/scratch:rw,noexec,nosuid,size=16m", "-v", `${bundleDirectory}:${bundleDirectory}:ro`,
      linuxImage, "node", "--input-type=module", "-e", program, payload,
    ];
    const { stdout } = await promisify(execFile)(command, args, { encoding: "utf8", timeout: 15_000, maxBuffer: 1024 * 1024,
      env: { ...process.env, NODE_OPTIONS: "", NODE_PATH: "" } });
    const result = JSON.parse(stdout);
    if (allowed) expect(result).toEqual({ calls: ["create", "begin", "finalize"], uploaded: ["boundary bytes"], status: "ready" });
    else {
      expect(result.calls).toEqual([]);
      expect(result.uploaded).toEqual([]);
      expect(result.error).toMatch(/1024/);
    }
  });
});

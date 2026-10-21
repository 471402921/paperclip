import { appendFile, mkdtemp, open, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

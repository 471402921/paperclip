import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { publishLocal, type NotebookPublishingApi } from "../client/notebook-publish.js";

vi.mock("node:dns/promises", () => ({ lookup: async (hostname: string) => {
  if (hostname !== "private-upload.test") throw new Error("Unexpected DNS lookup");
  return [{ address: "10.0.0.7", family: 4 }];
} }));

let directory: string;
beforeEach(async () => { directory = await mkdtemp(join(tmpdir(), "notebook-upload-security-")); await writeFile(join(directory, "index.html"), "<h1>Report</h1>"); });
afterEach(async () => { await rm(directory, { recursive: true, force: true }); });

it.each([
  "https://127.0.0.1/object", "https://10.0.0.7/object", "https://169.254.169.254/latest/meta-data/",
  "https://[::1]/object", "https://[::ffff:127.0.0.1]/object", "https://private-upload.test/object",
])("rejects server-supplied private upload destination %s before sending any bytes", async url => {
  const send = vi.fn(async () => new Response(null, { status: 200 }));
  const finalizeUpload = vi.fn(async () => ({ operationId: "d", status: "validating" }));
  const api: NotebookPublishingApi = {
    async createPage() { return { id: "p", version: 1 }; },
    async beginUpload() { return { deploymentId: "d", uploads: [{ path: "index.html", url }] }; },
    finalizeUpload,
  };
  await expect(publishLocal(api, { source: directory, idempotencyKey: "safe-upload", allowLoopbackUploads: true }, send))
    .rejects.toThrow("Notebook upload destination denied");
  expect(send).not.toHaveBeenCalled();
  expect(finalizeUpload).not.toHaveBeenCalled();
});

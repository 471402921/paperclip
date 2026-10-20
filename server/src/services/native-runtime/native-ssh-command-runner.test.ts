import { createHash } from "node:crypto";
import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createNativeSshCommandRunner } from "./native-ssh-command-runner.js";
import { MAX_REMOTE_DELIVERABLE_BYTES, readVerifiedRemoteWorkspaceFile } from "./remote-deliverable-file.js";

describe("native SSH deliverable output budget", () => {
  let root: string;
  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), "paperclip-ssh-output-"));
    // Exercise the real SSH command adapter and its execFile output limit,
    // replacing only the network executable with a deterministic byte source.
    const executable = join(root, "ssh");
    await writeFile(executable, `#!${process.execPath}\nprocess.stdout.write(require('node:fs').readFileSync(${JSON.stringify(join(root, "response"))}));\n`);
    await chmod(executable, 0o700);
    vi.stubEnv("PATH", `${root}:${process.env.PATH}`);
  });
  afterEach(async () => {
    vi.unstubAllEnvs();
    await rm(root, { recursive: true, force: true });
  });

  const createRunner = (factory = createNativeSshCommandRunner) => factory({
    spec: {
      host: "fixture.invalid", port: 22, username: "fixture",
      remoteWorkspacePath: "/workspace", remoteCwd: "/workspace",
      privateKey: null, knownHosts: null, strictHostKeyChecking: true,
    },
    defaultCwd: "/workspace",
  });

  it.each([64, MAX_REMOTE_DELIVERABLE_BYTES])("returns exact verified bytes for a %i-byte file through the SSH adapter", async (byteSize) => {
    const body = Buffer.alloc(byteSize, 65);
    await writeFile(join(root, "response"), body.toString("base64"));
    const result = await readVerifiedRemoteWorkspaceFile({
      runner: createRunner(), workspaceRoot: "/workspace", contentRef: "result.md",
      byteSize, sha256: createHash("sha256").update(body).digest("hex"),
    });
    expect(result.equals(body)).toBe(true);
  });

  it("stops a remote command that exceeds the maximum encoded envelope", async () => {
    await writeFile(join(root, "response"), Buffer.alloc(4 * Math.ceil(MAX_REMOTE_DELIVERABLE_BYTES / 3) + 1, 65));
    const result = await createRunner().execute({ command: "node", args: ["unused"], timeoutMs: 10_000 });
    expect(result.exitCode).not.toBe(0);
  });

  it("reads Notebook chunks through the actual SSH adapter at a configured 1 MiB ceiling", async () => {
    vi.stubEnv("PAPERCLIP_ATTACHMENT_MAX_BYTES", String(1024 * 1024));
    vi.resetModules();
    try {
      const { createNativeSshCommandRunner: factory } = await import("./native-ssh-command-runner.js");
      const { readVerifiedRemoteWorkspaceFile: read } = await import("./remote-deliverable-file.js");
      const chunk = Buffer.alloc(1024 * 1024, 65), body = Buffer.concat([chunk, chunk, chunk]);
      await writeFile(join(root, "response"), chunk.toString("base64"));
      const result = await read({ runner: createRunner(factory), workspaceRoot: "/workspace", contentRef: "result.bin",
        byteSize: body.length, sha256: createHash("sha256").update(body).digest("hex"), maxBytes: 25 * 1024 * 1024 });
      expect(result.equals(body)).toBe(true);
      await writeFile(join(root, "response"), Buffer.alloc(4 * Math.ceil(chunk.length / 3) + 1, 65));
      expect((await createRunner(factory).execute({ command: "node", timeoutMs: 10_000 })).exitCode).not.toBe(0);
    } finally {
      vi.resetModules();
    }
  });
});

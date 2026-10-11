import { chmod, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createSshCommandManagedRuntimeRunner } from "@paperclipai/adapter-utils/ssh";
import { COMMAND_DIAGNOSTIC_PHASES, reportCommandPhase, type CommandDiagnosticPhase } from "@paperclipai/adapter-utils/command-diagnostics";

const roots: string[] = [];
afterEach(async () => {
  vi.unstubAllEnvs();
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});
async function fixture(script: string) {
  const root = await mkdtemp(join(tmpdir(), "ssh-artifact-diagnostics-")); roots.push(root);
  await writeFile(join(root, "ssh"), `#!${process.execPath}\n${script}\n`);
  await chmod(join(root, "ssh"), 0o700);
  vi.stubEnv("PATH", `${root}:${process.env.PATH}`);
  return createSshCommandManagedRuntimeRunner({ spec: {
    host: "private-host-canary.invalid", port: 22, username: "private-user-canary",
    remoteWorkspacePath: "/private-path-canary", remoteCwd: "/private-path-canary",
    privateKey: null, knownHosts: null, strictHostKeyChecking: true,
  } });
}
describe("opt-in artifact SSH phase diagnostics", () => {
  it("records pipe flush, exit, close and cleanup without exposing command or output", async () => {
    const runner = await fixture("process.stdin.resume(); process.stdin.on('end', () => { process.stderr.write('private-output-canary'); process.exitCode = 7; });");
    const phases: CommandDiagnosticPhase[] = [];
    const result = await runner.execute({ command: "private-command-canary", args: ["private-arg-canary"],
      env: { PRIVATE_TOKEN: "private-token-canary" }, stdin: "private-stdin-canary", timeoutMs: 3000,
      onPhase: phase => { phases.push(phase); } });
    expect(result.exitCode).toBe(7);
    expect(result.stderr).toBe("private-output-canary");
    expect(phases).toEqual(["ssh_auth_prepare", "ssh_auth_ready", "ssh_spawned", "ssh_stdin_flushed",
      "ssh_exit", "ssh_close", "ssh_auth_cleanup", "ssh_auth_cleaned"]);
    expect(JSON.stringify(phases)).not.toContain("canary");
  });
  it("retains the timeout and close boundary when a command never finishes", async () => {
    const runner = await fixture("process.stdin.resume(); setInterval(() => {}, 1000);");
    const phases: CommandDiagnosticPhase[] = [];
    const result = await runner.execute({ command: "unused", stdin: "payload", timeoutMs: 200,
      onPhase: phase => { phases.push(phase); } });
    expect(result.timedOut).toBe(true);
    expect(phases).toContain("ssh_timeout");
    expect(phases.indexOf("ssh_timeout")).toBeLessThan(phases.indexOf("ssh_close"));
    expect(phases.slice(-2)).toEqual(["ssh_auth_cleanup", "ssh_auth_cleaned"]);
  });
  it.each(["throw", "reject"])("cannot change successful execution when its observer %ss", async kind => {
    const runner = await fixture("process.stdin.resume(); process.stdin.on('end', () => process.stdout.write('ok'));");
    const result = await runner.execute({ command: "unused", stdin: "payload", timeoutMs: 3000,
      onPhase: () => { if (kind === "throw") throw new Error("observer canary"); return Promise.reject(new Error("observer canary")); } });
    expect(result).toMatchObject({ exitCode: 0, stdout: "ok", timedOut: false });
  });
  it("rejects unrecognized phase strings before calling the observer", () => {
    const observer = vi.fn();
    reportCommandPhase(observer, "ssh_close private-path-canary" as CommandDiagnosticPhase);
    expect(observer).not.toHaveBeenCalled();
    for (const phase of COMMAND_DIAGNOSTIC_PHASES) reportCommandPhase(observer, phase);
    expect(observer).toHaveBeenCalledTimes(COMMAND_DIAGNOSTIC_PHASES.length);
  });
});

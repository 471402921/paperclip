import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, readFile, readdir, realpath, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { stageRunnerBinary } from "./stage-runner-binary.mjs";
import { RELEASE_RUNNER_TARGETS, releaseDaemonManifest, verifyReleaseRunnerMetadata } from "./stage-release-runner-binaries.mjs";

const contract = { package: { name: "@paperclipai/paperclip-runner", version: "0.0.0" },
  contracts: { runnerdArtifact: 2, nativeExecution: 1, harnessDriver: 1 }, prp: { name: "paperclip.runner", minimumVersion: 1, maximumVersion: 3 } };
const metadata = { binaryContractVersion: 2, nativeExecutionVersion: 1, harnessDriverVersion: 1,
  packageName: "@paperclipai/paperclip-runner", packageVersion: "0.0.0", prp: { name: "paperclip.runner", minimumVersion: 1, maximumVersion: 2 } };

test("release assembly binds all three actual targets, source, hashes and compatible metadata", async () => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "runner-release-inputs-"))), source = "a".repeat(40);
  const verify = value => verifyReleaseRunnerMetadata(value, contract);
  const receiptPath = target => path.join(root, target, "receipt.json");
  try {
    for (const target of RELEASE_RUNNER_TARGETS) {
      await mkdir(path.join(root, target));
      const bytes = Buffer.alloc(64);
      if (target === "linux-x64") {
        bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1]); bytes.writeUInt16LE(62, 18);
      } else { bytes.writeUInt32LE(0xfeedfacf); bytes.writeUInt32LE(target === "darwin-x64" ? 0x01000007 : 0x0100000c, 4); }
      await writeFile(path.join(root, target, "paperclip-runnerd"), bytes);
      await writeFile(receiptPath(target), JSON.stringify({ schema: "paperclip.runner.release-artifact.v1", sourceRevision: source,
        target, sha256: "sha256:" + createHash("sha256").update(bytes).digest("hex"), buildMetadata: metadata }));
    }
    const actual = releaseDaemonManifest(root, source, verify);
    assert.deepEqual(Object.keys(actual.platforms), RELEASE_RUNNER_TARGETS);
    assert.equal(actual.remoteProviderPack, undefined, "Daemon-only data does not qualify a provider pack");
    assert.throws(() => releaseDaemonManifest(root, "b".repeat(40), verify), /source, digest or architecture/);
    const original = await readFile(receiptPath("darwin-arm64"), "utf8"), receipt = JSON.parse(original);
    for (const delta of [{ target: "darwin-x64" }, { sha256: "sha256:" + "0".repeat(64) }, { sourceRevision: "b".repeat(40) },
      { buildMetadata: { ...metadata, binaryContractVersion: 99 } }]) {
      await writeFile(receiptPath("darwin-arm64"), JSON.stringify({ ...receipt, ...delta }));
      assert.throws(() => releaseDaemonManifest(root, source, verify));
    }
    await writeFile(receiptPath("darwin-arm64"), original);
    const binary = path.join(root, "darwin-arm64/paperclip-runnerd"), bytes = await readFile(binary);
    await writeFile(binary, await readFile(path.join(root, "darwin-x64/paperclip-runnerd")));
    assert.throws(() => releaseDaemonManifest(root, source, verify), /digest or architecture/);
    await rm(binary); await symlink(path.join(root, "darwin-x64/paperclip-runnerd"), binary);
    assert.throws(() => releaseDaemonManifest(root, source, verify), /regular file/);
    await rm(binary); await writeFile(binary, bytes);
    await mkdir(path.join(root, "win32-x64"));
    assert.throws(() => releaseDaemonManifest(root, source, verify), /exactly the three/);
    await rm(path.join(root, "win32-x64"), { recursive: true });
    await rm(receiptPath("linux-x64"));
    assert.throws(() => releaseDaemonManifest(root, source, verify), /only its daemon and receipt/);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("release metadata rejects incompatible native, harness and protocol contracts without semver heuristics", () => {
  assert.equal(verifyReleaseRunnerMetadata(metadata, contract), metadata);
  for (const delta of [{ nativeExecutionVersion: 9 }, { harnessDriverVersion: 9 }, { packageName: "untrusted" },
    { prp: { ...metadata.prp, name: "other" } }, { prp: { ...metadata.prp, minimumVersion: 4, maximumVersion: 5 } }]) {
    assert.throws(() => verifyReleaseRunnerMetadata({ ...metadata, ...delta }, contract), /incompatible/);
  }
});

async function withOwnedChildren(root, action) {
  const owned = [];
  const start = (command, args) => {
    const child = spawn(command, args, { env: { PATH: "/usr/bin:/bin" }, stdio: "ignore" });
    // close follows both exit and spawn error. A failed second spawn must not
    // interrupt retirement of the first still-running executable.
    const closed = new Promise(resolve => child.once("close", resolve));
    const spawned = once(child, "spawn");
    void spawned.catch(() => {});
    owned.push({ child, closed });
    return { child, spawned, closed };
  };
  try { return await action(start); }
  finally {
    try {
      const results = await Promise.allSettled(owned.map(async ({ child, closed }) => {
        if (child.pid && child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        await closed;
      }));
      const failures = results.filter(result => result.status === "rejected");
      if (failures.length) throw new AggregateError(failures.map(result => result.reason), "Owned test child cleanup failed");
    } finally { await rm(root, { recursive: true, force: true }); }
  }
}

test("atomically publishes while the previous executable is running", { skip: process.platform === "win32", timeout: 15_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "runnerd-stage-test-"));
  const destination = path.join(root, "paperclip-runnerd");
  await withOwnedChildren(root, async start => {
    await stageRunnerBinary("/bin/sleep", destination);
    const previous = await stat(destination);
    const old = start(destination, ["30"]);
    await old.spawned;
    await stageRunnerBinary("/bin/sleep", destination);
    const published = await stat(destination);
    assert.notEqual(published.ino, previous.ino);
    assert.equal(published.mode & 0o777, 0o755);
    assert.equal(old.child.exitCode, null);
    assert.equal(old.child.signalCode, null);
    assert.deepEqual(await readdir(root), ["paperclip-runnerd"]);
    const next = start(destination, ["0"]);
    await next.spawned; await next.closed;
    assert.equal(next.child.exitCode, 0);
  });
});

test("a second spawn error still retires the live old child and removes its fixture", { skip: process.platform === "win32", timeout: 15_000 }, async () => {
  const root = await mkdtemp(path.join(tmpdir(), "runnerd-stage-spawn-failure-"));
  let old;
  await assert.rejects(withOwnedChildren(root, async start => {
    old = start("/bin/sleep", ["30"]); await old.spawned;
    const failed = start(path.join(root, "missing-executable"), []);
    await failed.spawned;
  }), { code: "ENOENT" });
  assert.notEqual(old.child.signalCode, null);
  await assert.rejects(stat(root), { code: "ENOENT" });
});

test("failed preparation preserves the published bytes and mode", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "runnerd-stage-failure-"));
  const destination = path.join(root, "paperclip-runnerd");
  try {
    await writeFile(destination, "previous build", { mode: 0o755 });
    const before = await stat(destination);
    await assert.rejects(stageRunnerBinary(path.join(root, "absent-source"), destination), { code: "ENOENT" });
    assert.equal(await readFile(destination, "utf8"), "previous build");
    const after = await stat(destination);
    assert.equal(after.ino, before.ino);
    assert.equal(after.mode, before.mode);
    assert.deepEqual(await readdir(root), ["paperclip-runnerd"]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

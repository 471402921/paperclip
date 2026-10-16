import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { loadShardDurations } from "../general-server-shard.mjs";
import { projectFileShard, projectTestFiles } from "../project-test-shard.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

test("actual Vitest file discovery produces a complete disjoint adapter-utils cover", { timeout: 30_000 }, () => {
  const temporary = mkdtempSync(path.join(os.tmpdir(), "project-file-collection-"));
  try {
    const inventory = path.join(temporary, "files.json");
    const cli = path.join(path.dirname(fileURLToPath(import.meta.resolve("vitest/package.json"))), "vitest.mjs");
    const result = spawnSync(process.execPath, [cli, "list", "--project", "@paperclipai/adapter-utils",
      "--exclude", "**/dist/**", "--filesOnly", `--json=${inventory}`], {
      cwd: repoRoot, env: { ...process.env, PAPERCLIP_CI_PROFILE: "false" }, encoding: "utf8", timeout: 20_000,
    });
    assert.equal(result.status, 0, result.stderr);
    const specifications = JSON.parse(readFileSync(inventory, "utf8"));
    const options = { root: repoRoot, project: "@paperclipai/adapter-utils", directory: "packages/adapter-utils",
      count: 4, durations: loadShardDurations(path.join(repoRoot, "scripts/adapter-utils-shard-durations.json")) };
    const all = projectTestFiles(specifications, options);
    assert.ok(all.length > 50);
    const selected = Array.from({ length: 4 }, (_, index) => projectFileShard(specifications, { ...options, index }));
    assert.ok(selected.every(shard => shard.total === all.length));
    assert.deepEqual(selected.flatMap(shard => shard.files).sort(), all);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
});

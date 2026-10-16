import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { planVitestTransformCache, vitestTransformCache } from "../vitest-transform-cache.mjs";

const root = fileURLToPath(new URL("../../", import.meta.url));
const inputs = new Map([
  ["package.json", "{}"], ["pnpm-lock.yaml", "lock"], ["vitest.config.ts", "config"],
  ["ui/package.json", "{}"], ["ui/src/example.ts", "source"], ["scripts/transform.mjs", "plugin"],
]);
const plan = (values = inputs, scope = { node: "24", arch: "x64" }, directory = "/repo") => planVitestTransformCache({ files: [...values.keys()], read: name => values.get(name) ?? null, root: directory, scope });

test("ordinary source edits retain the namespace; resolution and compiler inputs invalidate it", () => {
  const before = plan();
  assert.equal(plan(new Map([...inputs, ["ui/src/example.ts", "changed"]])).key, before.key);
  for (const name of ["package.json", "pnpm-lock.yaml", "vitest.config.ts", "ui/package.json", "scripts/transform.mjs"]) {
    assert.notEqual(plan(new Map([...inputs, [name, "changed"]])).key, before.key, name);
  }
  assert.notEqual(plan(new Map([...inputs, ["ui/src/new-module.ts", "new"]])).key, before.key);
  const removed = new Map(inputs); removed.delete("ui/src/example.ts");
  assert.notEqual(plan(removed).key, before.key);
  assert.notEqual(plan(inputs, { node: "25", arch: "x64" }).key, before.key);
  assert.notEqual(plan(inputs, { node: "24", arch: "arm64" }).key, before.key);
  assert.notEqual(plan(inputs, undefined, "/other").key, before.key);
});

test("missing compiler inputs disable reuse and escaped inputs are rejected", () => {
  const noLock = new Map(inputs); noLock.delete("pnpm-lock.yaml");
  assert.equal(plan(noLock), null);
  assert.equal(plan(new Map([...inputs, ["vitest.config.ts", null]])), null);
  assert.throws(() => plan(new Map([...inputs, ["../package.json", "{}"]])), /escapes/);
  assert.equal(vitestTransformCache(root, { PAPERCLIP_VITEST_FS_MODULE_CACHE: "false" }), null);
});

test("local Vite environment files and compiler environment invalidate reuse", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "pc-cache-inputs-"));
  try {
    execFileSync("git", ["init", "-q"], { cwd: directory });
    writeFileSync(path.join(directory, "package.json"), "{}");
    writeFileSync(path.join(directory, "pnpm-lock.yaml"), "lock");
    writeFileSync(path.join(directory, "vitest.config.ts"), "config");
    writeFileSync(path.join(directory, ".gitignore"), ".env.local\n");
    const env = { NODE_ENV: "test", VITE_CACHE_PROOF: "one" };
    const before = vitestTransformCache(directory, env);
    assert.ok(before);
    assert.notEqual(vitestTransformCache(directory, { ...env, VITE_CACHE_PROOF: "two" }).key, before.key);
    assert.notEqual(vitestTransformCache(directory, { ...env, NODE_OPTIONS: "--conditions=example" }).key, before.key);
    writeFileSync(path.join(directory, ".env.local"), "VITE_CACHE_PROOF=one\n");
    const withLocal = vitestTransformCache(directory, env);
    assert.notEqual(withLocal.key, before.key);
    writeFileSync(path.join(directory, ".env.local"), "VITE_CACHE_PROOF=two\n");
    assert.notEqual(vitestTransformCache(directory, env).key, withLocal.key);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("both cache-save guards reject PRs, other repositories, and noncanonical source refs", () => {
  const action = readFileSync(path.join(root, ".github/actions/vitest-transform-cache/action.yml"), "utf8");
  const steps = action.split(/^    - name: /m).slice(1);
  const guards = ["Verify canonical producer", "Save canonical module transforms"].map(name => {
    const matches = steps.filter(step => step.startsWith(`${name}\n`));
    assert.equal(matches.length, 1, `Expected exactly one ${name} step`);
    const guard = matches[0].match(/^      if: >-\n([\s\S]*?)(?=^      [\w-]+:)/m);
    assert.ok(guard, `Missing ${name} guard`);
    return guard[1];
  });
  const canonical = { repository: "paperclipai/paperclip", repository_id: "1170821064", event_name: "push", ref: "refs/heads/master", sha: "a".repeat(40) };
  for (const guard of guards) {
    const expression = guard.trim().replaceAll("inputs.verified-ref", "inputs.verifiedRef");
    const allowed = new Function("github", "inputs", "steps", `return ${expression}`);
    const evaluate = (github = canonical, inputs = {}, cacheable = "true") => allowed( github,
      { mode: "save", verifiedRef: canonical.sha, ...inputs }, { scope: { outputs: { cacheable } } });
    assert.equal(evaluate(), true);
    for (const override of [
      { event_name: "pull_request" }, { event_name: "workflow_dispatch" }, { ref: "refs/heads/other" },
      { repository: "other/paperclip" }, { repository_id: "0" }, { sha: "" }, { sha: "b".repeat(40) },
    ]) assert.equal(evaluate({ ...canonical, ...override }), false);
    assert.equal(evaluate(canonical, { mode: "restore" }), false);
    assert.equal(evaluate(canonical, { verifiedRef: "b".repeat(40) }), false);
    assert.equal(evaluate(canonical, {}, "false"), false);
  }
  assert.match(action, /test "\$\(git rev-parse HEAD\)" = '\$\{\{ github\.sha \}\}'/);
  for (const match of action.matchAll(/^        key: (.*)$/gm)) {
    assert.ok(!match[1].includes("github.sha"), "module-cache storage must not grow by an archive per commit");
  }
  for (const [workflow, writers] of [["pr-trusted.yml", 0], ["release-verify.yml", 2]]) {
    const source = readFileSync(path.join(root, ".github/workflows", workflow), "utf8");
    assert.equal([...source.matchAll(/name: Restore Vitest transforms/g)].length, 2);
    assert.equal([...source.matchAll(/name: Save canonical Vitest transforms/g)].length, writers);
  }
});

test("warm transforms still execute tests, invalidate changed content, and isolate forks and mocks", { timeout: 90_000 }, () => {
  const directory = mkdtempSync(path.join(tmpdir(), "pc-fs-cache-"));
  try {
    const cache = path.join(directory, "cache"), record = path.join(directory, "executions.ndjson");
    const api = path.join(root, "node_modules/vitest/dist/index.js");
    const config = path.join(directory, "vitest.config.mjs");
    writeFileSync(config, `export default {resolve:{alias:{vitest:${JSON.stringify(api)}}},test:{root:${JSON.stringify(directory)},include:['*.test.ts'],pool:'forks',isolate:true,maxWorkers:1,fileParallelism:false,fsModuleCache:true,fsModuleCachePath:${JSON.stringify(cache)}}};`);
    const dependency = path.join(directory, "dependency.ts");
    writeFileSync(dependency, "export const value = 1;\n");
    for (const [name, expected, mocked] of [["real", 1, false], ["mock-one", 11, true], ["mock-two", 22, true]]) {
      writeFileSync(path.join(directory, `${name}.test.ts`), `
import {expect,it,vi} from 'vitest';
import {appendFileSync} from 'node:fs';
import {value} from './dependency.ts';
${mocked ? `vi.mock('./dependency.ts',()=>({value:${expected}}));` : ""}
it(${JSON.stringify(name)},()=>{
 expect(globalThis.cacheLeak).toBeUndefined();
 expect(process.env.CACHE_LEAK).toBeUndefined();
 expect(value).toBe(${expected});
 globalThis.cacheLeak=true;process.env.CACHE_LEAK='yes';
 appendFileSync(${JSON.stringify(record)},JSON.stringify({name:${JSON.stringify(name)},pid:process.pid,home:process.env.PAPERCLIP_HOME})+'\\n');
});`);
    }
    const run = (label, expectedStatus) => {
      const home = path.join(directory, label); mkdirSync(home);
      const result = spawnSync(process.execPath, [path.join(root, "node_modules/vitest/vitest.mjs"), "run", "--config", config], {
        cwd: directory, encoding: "utf8", timeout: 30_000,
        env: { ...process.env, NODE_ENV: "test", PAPERCLIP_HOME: home, PAPERCLIP_CONFIG: path.join(home, "config.json") },
      });
      assert.equal(result.status, expectedStatus, result.stdout + result.stderr);
    };
    run("cold", 0);
    assert.ok(readdirSync(cache).length > 1);
    run("warm", 0);
    const original = statSync(dependency);
    writeFileSync(dependency, "export const value = 2;\n");
    utimesSync(dependency, original.atime, original.mtime);
    run("changed", 1);
    writeFileSync(dependency, "export const value = 1;\n");
    utimesSync(dependency, original.atime, original.mtime);
    run("restored", 0);
    const executions = readFileSync(record, "utf8").trim().split("\n").map(line => JSON.parse(line));
    for (const label of ["cold", "warm", "restored"]) {
      const rows = executions.filter(row => row.home === path.join(directory, label));
      assert.deepEqual(rows.map(row => row.name).sort(), ["mock-one", "mock-two", "real"]);
      assert.equal(new Set(rows.map(row => row.pid)).size, 3);
    }
    assert.deepEqual(executions.filter(row => row.home === path.join(directory, "changed")).map(row => row.name).sort(), ["mock-one", "mock-two"]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

import assert from "node:assert/strict";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import * as schema from "../packages/db/src/index.js";

const require = createRequire(new URL("../server/package.json", import.meta.url));
const { sql } = require("drizzle-orm");
const { PgDialect } = require("drizzle-orm/pg-core");
const baselineRef = process.argv.find(arg => arg.startsWith("--baseline-ref="))?.slice(15);
assert.ok(baselineRef, "Supply an explicit pre-fix --baseline-ref");
assert.equal(execFileSync("git", ["status", "--porcelain"], { encoding: "utf8" }).trim(), "",
  "Commit benchmark and treatment changes before measuring");
const revision = (ref: string) => execFileSync("git", ["rev-parse", "--verify", `${ref}^{commit}`], { encoding: "utf8" }).trim();
const baselineRevision = revision(baselineRef), treatmentRevision = revision("HEAD");
const file = "server/src/services/git-workspace-expiration.ts";
const sources = Object.fromEntries(Object.entries({ baseline: baselineRevision, treatment: treatmentRevision })
  .map(([name, ref]) => [name, execFileSync("git", ["show", `${ref}:${file}`], { encoding: "utf8" })]));
const keepAlive = setInterval(() => {}, 1000);
let database: Awaited<ReturnType<typeof schema.startEmbeddedPostgresTestDatabase>> | undefined;
let db: schema.Db | undefined;
try {
  database = await schema.startEmbeddedPostgresTestDatabase("git-expiration-benchmark-");
  db = schema.createDb(database.connectionString);
  const companyId = randomUUID(), agentId = randomUUID(), issueId = randomUUID(), otherIssueId = randomUUID(), workspaceId = randomUUID();
  const now = new Date(), finishedAt = new Date(now.getTime() - 48 * 3_600_000);
  await db.insert(schema.companies).values({ id: companyId, name: "Synthetic cleanup", issuePrefix: "CLEAN" });
  await db.insert(schema.agents).values({ id: agentId, companyId, name: "Fixture", adapterType: "process" });
  await db.insert(schema.issues).values([
    { id: issueId, companyId, title: "Finished task", status: "done", completedAt: finishedAt },
    { id: otherIssueId, companyId, title: "Other task", status: "done", completedAt: finishedAt },
  ]);
  const workspace = { id: workspaceId, companyId, sourceIssueId: issueId, cwd: "/synthetic/cleanup/worktree" };
  const names = ["issues", "heartbeatRuns", "nativeRunFinalizations", "environmentLeases",
    "workspaceRuntimeServices", "executionWorkspaces", "projectWorkspaces", "issueRecoveryActions"] as const;
  const args = { sql, workspace, now, DAY_MS: 86_400_000, ...Object.fromEntries(names.map(name => [name, schema[name]])) };
  const queries = Object.fromEntries(Object.entries(sources).map(([name, source]) => {
    const match = source.match(/const rows = await tx\.execute[^\n]*\(sql`([\s\S]*?)`\);/);
    assert.ok(match, `${name} must contain the expiration eligibility SQL`);
    const query = new Function(...Object.keys(args), `return sql\`${match[1]}\`;`)(...Object.values(args));
    return [name, new PgDialect().sqlToQuery(query) as { sql: string; params: unknown[] }];
  }));
  const results = [];
  for (const historyRuns of [0, 2000]) {
    if (historyRuns) {
      for (let offset = 0; offset < historyRuns; offset += 100) {
        const runs = Array.from({ length: 100 }, (_, index) => ({
          id: randomUUID(), companyId, agentId, status: "succeeded", finishedAt,
          nativeIssueId: otherIssueId,
          contextSnapshot: { prompt: randomBytes(72 * 1024).toString("base64"),
            ...(index === 0 ? { executionWorkspaceId: workspaceId } : {}) },
        }));
        await db.insert(schema.heartbeatRuns).values(runs);
        if (offset === 0) await db.insert(schema.nativeRunFinalizations).values(runs.slice(1, 48)
          .map(run => ({ runId: run.id, companyId, issueId: otherIssueId, phase: "pending" })));
      }
    }
    await db.$client.unsafe("ANALYZE heartbeat_runs");
    const samples: Record<string, number[]> = { baseline: [], treatment: [] };
    for (let iteration = 0; iteration < 12; iteration++) {
      for (const name of iteration % 2 ? ["treatment", "baseline"] : ["baseline", "treatment"]) {
        const query = queries[name]!;
        const start = performance.now();
        const rows = await db.$client.unsafe(query.sql, query.params as never[]);
        if (iteration >= 2) samples[name]!.push(performance.now() - start);
        assert.deepEqual(rows.map(row => ({ ...row })), [{ allowed: true }], `${name} changed the cleanup verdict`);
      }
    }
    const measurements = [];
    for (const [name, query] of Object.entries(queries)) {
      const sorted = [...samples[name]!].sort((a, b) => a - b);
      const [plan] = await db.$client.unsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`, query.params as never[]);
      measurements.push({ name, samplesMs: samples[name], medianMs: sorted[5], plan: plan!["QUERY PLAN"] });
    }
    results.push({ historyRuns, unrelatedBlockingFinalizations: historyRuns ? 47 : 0,
      contextBytesPerRun: 96 * 1024, verdictEqual: true, measurements });
  }
  const [version] = await db.$client.unsafe("SELECT version() AS version");
  const settings = await db.$client.unsafe("SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers','work_mem','effective_cache_size','jit') ORDER BY name");
  console.log(JSON.stringify({ baselineRevision, treatmentRevision, node: process.version,
    dependencyLockfileSha256: createHash("sha256").update(readFileSync(new URL("../pnpm-lock.yaml", import.meta.url))).digest("hex"),
    postgres: version!.version, settings, queries, results }, null, 2));
} finally {
  try {
    await db?.$client.end({ timeout: 0 });
    await database?.cleanup();
  } finally {
    clearInterval(keepAlive);
  }
}

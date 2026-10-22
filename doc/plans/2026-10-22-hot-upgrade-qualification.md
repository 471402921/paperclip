# Hot-upgrade qualification

Date: 2026-10-22. Owner: the existing Runner protocol, native runtime integration,
and Product E2E harnesses. Related implementation: [hot upgrades](2026-10-21-daytona-hot-upgrades.md),
[continuity runbook](../testing-native-remote-continuity.md), PR #17097.

## Acceptance contract

An admitted remote agent keeps its sandbox, runner process, provider session and
active turn while the control plane is unavailable for up to 300 seconds.
Server-dependent calls wait and reconnect. After HTTP returns, admitted work and
queued launches recover automatically and new work can launch without an operator
drain. The runner's existing 420-second reconnect grace includes server startup
and ownership acquisition; tests must not reset that deadline on each retry.

Postgres, the instance encryption key and the sandbox survive. This does not
promise HTTP availability while the only web server is offline, survival of a
destroyed sandbox, retroactive support in older running binaries, or reconstruction
of an acknowledged display-only log tail. Never repeat a provider turn or external
effect to fill a display gap.

## Evidence layers

| Layer | Execution and owner | What it proves | Cadence |
| --- | --- | --- | --- |
| Protocol | Runner tests; controlled ACK/persistence/effect faults | Replay, authenticated sparse cursors, durable barriers, bounded queues | Every relevant PR |
| Recovery integration | Real Postgres and Rust runner; deterministic provider | Ownership races, encryption, empty cache, side-effect settlement, same turn | Every relevant PR |
| Server replacement | Product E2E wrapper kills/replaces the actual main server; production HTTP workflow | Startup adoption, natural lease timing, same sandbox/run, finalization and admission | Relevant PR; exact hosted cell before release |
| Version compatibility | Immutable server A then B, admitted runner digest, real migrations; compatible rollback | Upgrade contract across different artifacts | Before release |
| Efficiency | Identical scripted workload with and without checkpoints, plus restart burst | Incremental DB work, latency, throughput, backlog and resource bounds | Relevant PR; capacity campaign before release |

Keep these claims separate. A scripted provider is a reproducible correctness
instrument, not a qualification of the real provider or Daytona. A same-version
restart is not an A-to-B upgrade. A wrapper test is not an agent continuity test.

## Fault and workload matrix

Start with one server replacement and one cost comparison; extend the same harness
rather than create parallel recovery implementations or production test switches.

| Axis | Required cases |
| --- | --- |
| Fault | Graceful stop; SIGKILL; transport partition with old owner alive |
| Unavailability | Short; around the natural lease expiry; full 300 seconds |
| Work at boundary | Streaming; server read waiting; mutation committed with response lost; completion during outage; queued launch |
| Competition | Two successors; stale owner resumes; Stop/authority change; second restart during recovery |
| Versions | A to B plus migrations; B to compatible A; unsupported runner fails explicitly |
| Load | Expected peak; twice peak; synchronized reconnects; idle with retained history |

The harness records that the original run was active at injection. An unexercised
boundary fails, even if a later task succeeds. Use deterministic gates for the
scripted workload; wall-clock sleeps alone cannot establish where an effect was.
Never edit lease timestamps or recovery state in a server-replacement journey.

## Hard correctness gates

- Preserve sandbox lease, runner PID **and process start identity**, provider
  session and active turn. The provider call ledger must show one turn start.
- Check an external fixture's effect ledger independently: a write occurs once,
  including when its response is lost. Tool-ID deduplication alone is insufficient.
- An uncertain write is visibly held; an ordinary read can retry under current
  authority. A stale owner cannot write a command or acknowledge an event.
- The original run commits once, including accounting and workspace finalization;
  no stranded operation or recovery action remains.
- Queued/admitted work resumes and a newly submitted task launches after readiness.
- Record fault receipt, actual elapsed outage, server readiness, natural ownership
  eligibility, reattachment and backlog-drained times separately. Recovery must
  fit the original 420-second grace. A healthy HTTP endpoint alone cannot pass.
- Missing provenance, missing boundary evidence, unexpected skips, cleanup failure
  and automatic retry do not qualify an attempt.

## Efficiency gates and measurements

The lean design keeps control state, not a second transcript. The existing run
log, business writes and 20-second lease renewals remain baseline work.

1. **Zero checkpoint writes for ordinary text chunks.** Compare a small stream
   and a much larger stream with the same control operations. Assert callback,
   SQL and changed-row counts, not just final table size. Updates to one row are
   still load. Calibration must make a deliberate extra write fail the gate.
2. **Zero added checkpoint SQL while idle after startup.** Exercise both empty
   and retained history. Retention may do its bounded startup pass; the existing
   filesystem cleanup timer must not query checkpoint rows.
3. **Measure each control boundary.** Capture checkpoint transactions, inserted/
   updated/deleted rows, payload bytes, WAL bytes and lock waits in an isolated
   Postgres database. Report measurement-query overhead separately. Never count
   a mocked persistence callback as a WAL measurement.
4. **Compare normal-operation cost first**, then restart cost: same fixed seed,
   concurrent agents, output rate, tool mix and duration; warmup plus repeated
   paired samples. Report throughput, CPU, peak RSS and p50/p95/p99 control latency.
   Provisional acceptance is at most 5% throughput regression at expected peak;
   establish the baseline and expected peak before treating that as a release gate.
5. **Bound backlog and recovery pressure.** A five-minute outage must fit the
   configured runner outbox budget and drain without starving new commands or
   fresh admissions. At twice peak, pressure must remain bounded and explicit.

Do not infer production dollars or capacity from a laptop timing result. Persist
raw sample counts and distributions; noisy timing is diagnostic, not a flaky
single-sample CI assertion. Structural zero-write checks are deterministic gates.

## Attempt record and implementation order

Every attempt retains the two server revisions/artifact digests, runner digest,
workload configuration, fault receipt, monotonic elapsed times, independent effect
ledger, recovery identity, database measurements and cleanup outcome. Store private
logs under the existing harness private-artifact policy; publish only sanitized
receipts. Keep failed attempts alongside subsequent successes; no automatic retries.

1. Add a bounded, cancellable actual-server outage to the existing restart wrapper,
   with a receipt the remote continuity grader requires. Test missing/incorrect
   receipts and real process replacement. Leave the existing finalization fault
   and local process ownership contracts intact.
2. Add repeatable Postgres checkpoint-write measurements to the existing native
   integration suite, including the zero-stream-write gate and a positive control.
3. Run the exact hosted remote continuity cell at short and full-contract outages.
   Resolve the image-builder disk failure before another paid attempt. Do not
   promote a suite that failed before sandbox launch.
4. Extend to pinned A/B artifacts, deterministic mixed workload/effect faults,
   two-owner contention, outbox pressure and the paired peak-load benchmark.

## Evidence status at the start of this slice

- Existing tests cover authenticated sparse replay, transactional checkpoint
  fencing, uncertain tool recovery, delta updates and idle/retention behavior.
- The 300-second integration proof uses real Postgres/Rust and a scripted provider,
  deletes controller files, and retains the active turn. It **manually expires a
  lease and does not replace the main server**; it is not the server-upgrade gate.
- The hosted `everyday-workflows.runner-codex.daytona.recover-controller` cell
  already replaces the server and grades original-run identity and finalization,
  but needs an explicit outage receipt and configurable crash/outage duration.
- Hosted attempts 39613279281 and 39616972414 failed in image preparation with
  ENOSPC before sandbox launch. No Daytona continuity pass is claimed.
- Different server versions, independent external-effect counting, mixed-load
  capacity/WAL measurements and production cost estimates are not yet qualified.

Implementation results and exact commands belong below, with their limitations.

## Implemented qualification slice

- `tests/runner-e2e/controller-outage.ts` owns bounded fault injection and
  monotonic phase receipts. The actual server wrapper uses it only for the
  explicit remote cache-replacement cell. Signal, minimum hold (0..300000 ms),
  old/new process IDs and incomplete attempts are inspectable. Cancellation
  prevents a successor launch. Missing/short/foreign fault receipts fail grading.
- The existing hosted cell defaults to SIGKILL and a 1000 ms hold, requires this
  receipt, and forbids automatic retries. Its definition version and harness
  fingerprint changed. The full hold is selectable using
  `PAPERCLIP_RUNNER_E2E_CONTROLLER_OUTAGE_MS=300000`; SIGTERM is also selectable.
- `controller-replacement-smoke.ts` is a credential-free actual-main-server
  probe with Postgres owned by the test driver. It checks unchanged Postgres
  start time, existing HTTP data, new HTTP mutations and complete process cleanup.
  It deliberately reports `activeAgentContinuityQualified: false`.
- The native restart integration suite now measures actual checkpoint SQL through
  postgres.js, checkpoint transactions/changed rows/bytes, diagnostic cluster WAL,
  and elapsed time for identical control operations with 8 versus 512 text chunks.
  Equal write/transaction/row counts are the gate; a subsequent real control write
  calibrates the observer. A settled-stream interval must issue zero SQL. Broader
  idle cleanup remains covered by the existing retention tests. These timings and
  WAL values are not a paired capacity benchmark or production cost estimate.

Commands (run from the repository root):

```sh
pnpm test:e2e:runner:typecheck
pnpm test:e2e:runner:unit -- --maxWorkers=2
node cli/node_modules/tsx/dist/cli.mjs tests/runner-e2e/controller-replacement-smoke.ts
PAPERCLIP_TEST_CHECKPOINT_COST_REPORT=/tmp/checkpoint-cost-attempt-1.json pnpm exec vitest run server/src/services/native-runtime/native-runner-restart-recovery.integration.test.ts -t 'keeps checkpoint SQL independent' --maxWorkers=1
```

Choose a new cost-report filename for each attempt; existing evidence is never
overwritten. Build the existing Rust fake provider after changing its fixture
flags (`cargo build --manifest-path packages/paperclip-runner/runner/Cargo.toml
--locked -p paperclip-runner-core --bin fake-codex-app-server`). No LLM credentials
are needed for these local probes.

Initial evidence on 2026-10-22:

- 50 focused fault/oracle tests passed. Server typecheck passed.
- Actual-main-server SIGKILL smoke passed: a 1000 ms confirmed-down hold, readiness
  62.82 seconds after injection, unchanged Postgres start time, data continuity,
  new mutation and confirmed cleanup. This used source revision 436b2ce12 plus
  the working changes, not two released artifacts.
- The real Postgres/Rust cost gate passed with 64 times as many text chunks.
  Earlier 4096-chunk attempts exceeded the original ten-second observation bound;
  they did not establish a DB regression or pass. The fast gate now uses 8/512
  and a bounded 60-second observation window. Large backlog capacity remains a
  separate gate, not silently qualified by this smaller sample.
- The first smoke launcher attempt failed on workspace package imports before
  server launch. Direct source imports fixed the standalone entrypoint.
- The first complete support-suite run had 3571 passing tests, two explicit skips,
  and five failures in existing catalog version/count and Daytona image-input
  assertions. These must be reconciled before calling this slice PR-ready.

Still outstanding: hosted active-agent proof, full 300-second actual-server
qualification, version A/B artifacts and migration/rollback, deterministic mixed
work/effect ledger, natural-lease race matrix, and paired peak/overload measurements.

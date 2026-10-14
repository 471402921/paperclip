# Test audit: server native-runtime duplicate-registration aliases

Date: 2026-10-14
Baseline: `90a45ef25` (master)
Skill: installed test-audit (v3) with bundled references (`references/audit.md`,
`references/validation.md`, `references/paperclip.md`)

## Scope

Focused cleanup of import-only test aliases under `server/src/__tests__/`
whose entire body re-imports another suite that is itself selected in the same
required PR runs. Three same-package aliases were removed; one cross-package
alias was retained. This is a reviewed subset, not an exhaustive audit.

## Evidence

- `server/vitest.config.ts` includes `src/**/*.test.ts`, so the alias files in
  `src/__tests__/` and their owner suites in `src/services/native-runtime/`
  are collected by the same vitest project.
- `scripts/general-server-shard-durations.json` (averaged from real PR runs
  38076844891 / 38076972444, 2026-10-10, serial maxWorkers=1 lanes) lists both
  each alias and its owner with separately measured durations, proving both
  execute in the required PR lanes.
- `scripts/run-vitest-stable.mjs` excludes only the chat suite and
  `nativeRunnerSuites` (3 named files) from lane variants; none of the audited
  aliases or owners are excluded anywhere, so they co-occur in every
  general-server invocation.
- No CI lane, script, or documented command references the removed alias
  filenames; nothing imports the alias files.

## Decisions

| Candidate | Decision | Contract re-registered | Keeper | Benefit |
| --- | --- | --- | --- | --- |
| `server/src/__tests__/heartbeat-native-runner-selection.test.ts` (1173 ms) | Delete | Re-executes `runtime-mode.test.ts` (1075 ms) | `server/src/services/native-runtime/runtime-mode.test.ts` | 1 duplicate registration |
| `server/src/__tests__/native-run-finalizer.test.ts` (19882 ms) | Delete | Re-executes `paperclip-control-plane-port.test.ts` (20670 ms) and `evidence-classifier.test.ts` (978 ms) | Both owners in `server/src/services/native-runtime/` | 1 duplicate registration incl. the heaviest suite |
| `server/src/__tests__/native-runner-phase6.integration.test.ts` (19600 ms) | Delete | Re-executes `paperclip-control-plane-port.test.ts` (20670 ms) | `server/src/services/native-runtime/paperclip-control-plane-port.test.ts` | 1 duplicate registration incl. the heaviest suite |
| `server/src/__tests__/native-runner-input-boundary.test.ts` (204 ms) | Retain (defer) | Re-executes `packages/paperclip-runner/src/contracts/native-execution.test.ts`, which is outside the server include glob and the root `vitest.config.ts` project list | Possibly the only server-lane entry point for the runner contracts suite; keep until its own required lane is verified or routing is repaired | n/a |

## LOC and cost

- Test/support LOC deleted: 4 (three 1-2 line import-only files). Production
  and docs LOC: this receipt only.
- Cost: historical manifest weights, not a measured saving: ~40.7 s of
  previously recorded serial shard wall-clock per PR run (1173 + 19882 +
  19600 ms), re-executing suites that already run as owners in the same
  required lanes. No runtime claim beyond that; no local timed baseline was
  run.

## Validation and limitations

- This isolated workspace has no installed dependencies, so no local vitest,
  typecheck, or build was run. Static checks: no file imports the removed
  aliases; the include glob still selects every retained owner; no lane,
  script, or manifest exclusion references the removed filenames.
- Fresh PR CI on the new head is the behavioral validation; the retained
  owners re-run there in the same lanes that previously also ran the aliases.
- Local git history is a shallow clone (depth 1), so per-file introduction
  history was not consulted; deletion evidence is current routing, selection,
  and manifest facts.

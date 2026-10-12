# Runs, harnesses, and model accounts

Operators choose an agent harness and model account, inspect execution history and transcripts, and distinguish a working configuration from a successful task result.

Implementation: [adapter manager](../../ui/src/pages/AdapterManager.tsx), [run host](../../ui/src/pages/AgentDetail.tsx), [configuration](../../ui/src/components/AgentConfigForm.tsx).

Agent access: [companion](../agent-access-map/runs-adapters.md).

## Sub-features

- `availability`: discover installed adapters and available models/accounts.
- `validation`: test an adapter in the selected execution environment and surface authentication failures.
- `runs`: inspect run status, events, output, costs, and the source task.
- `session`: preserve or reset execution context through supported lifecycle actions.

## How to get to it (user POV)

### `adapter-setup`

Open an agent’s model/adapter configuration or the instance adapter settings page when permitted.

### `run-history`

Open an agent run at `/agents/:agentId/runs/:runId` from the agent or task activity.

## Driving it with Playwright and the Paperclip CLI

Preconditions: follow the [baseline](./README.md#before-driving-a-journey). Record adapter, model, account, native/legacy runtime, and environment. Capabilities vary; one harness result is not a matrix-wide qualification.

### `adapter-setup`

Automated: [adapter validation routes](../../server/src/__tests__/agent-adapter-validation-routes.test.ts) and [model refresh](../../server/src/__tests__/adapter-model-refresh-routes.test.ts) cover server behavior.

Manual: Select the intended adapter and account, refresh model choices, and run its environment test. Save, reload, then execute a small task. Repeat with a deliberately unavailable account and verify the failure remains visible.

Choose Codex as the harness; the UI displays its name/icon for both runners.
Advanced identifies the automatic default and offers Paperclip Runner or Legacy.
Only new Codex agents default to the native runner on supported macOS or GNU/Linux
targets; the [shared selection contract](../../packages/shared/src/agent-runner.ts)
and [runtime prerequisites](../../packages/paperclip-runner/README.md) define the
platform/libc boundary. Windows and Alpine/musl remain Legacy; other harness
defaults are unchanged. Disabled adapters, external overrides, and selected-target
qualification also affect availability.

For sandbox defaults, follow the [environment probe](./execution-environments.md#environment-settings)
recipe first. Discovery/creation read company-bound immutable-image evidence
without allocating a target. A mutable image or snapshot name does not establish
native compatibility. Then test the actual selected runtime with its selected
account/model: a legacy CLI or authentication probe alone cannot establish native
readiness. Missing dependencies, failed authentication, invalid models and
incompatible custom settings must remain actionable errors without silent runner
switching. Saved unchanged execution can still be tested without applying new
selection policy, but runtime/account validation must still run.

Verify an automatic Codex hire and an explicit Legacy control through a useful
file artifact, follow-up and reload. Preserve Codex reasoning effort and account
isolation; retain explicit Legacy permission choices, including false. Reopen an
existing agent, make an unrelated edit, and confirm both its persisted runner and
next run stay unchanged. Use [hiring/import preservation](./agents.md#hire-agent)
for approval and portability controls.

### `run-history`

Automated: [live run routes](../../server/src/__tests__/agent-live-run-routes.test.ts) and [run event sequencing](../../server/src/__tests__/heartbeat-run-event-sequencing.test.ts) cover run data contracts.

Manual: Start a disposable task, open its running transcript, and follow it to a terminal outcome. Reload and compare task/run IDs, status, output, and cost. Verify a failed run remains distinguishable from a completed run with useful output.

An explicit runner change starts a configuration revision and invalidates the
eligible session. Active runs, restart recovery and historical transcript parsing
retain their recorded execution configuration; do not infer their runner from a
later edit to the agent. Account/harness branding and execution identity are
different observations, both required in the evidence.

## Gotchas

- Model accounts are managed in Apps and inline agent account controls.
  `/company/settings/connections` configures decision/fast-response models,
  not the general model-account library.

- The run log is instance database data; it is not the opt-out first-party Telemetry system or operator-configured OpenTelemetry tracing.
- Authentication/model discovery does not establish tool, image, steering, or resumption capability parity.
- Use [recovery](./recovery.md) for interrupted runs and [execution environments](./execution-environments.md) for local/SSH/sandbox differences.

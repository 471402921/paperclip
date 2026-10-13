# Runs, harnesses, and model accounts — agent access

Product map: [Runs, harnesses, and model accounts](../feature-map/runs-adapters.md).

Review date: 2026-10-12. Source commit: `f981fa3cc10cb8663a87dec60345fbff46d54d0a`.

This is a source-reviewed baseline of representative operations and known gaps.
Each capability needs operation-level review before its entire scope can be
qualified. No live agent execution is claimed. Follow the [map contract](../README.md)
for format, permission checks, evidence and maintenance.

Scoped runner-default source review: 2026-10-12 at
`eee0534154eaf5d0d3f2bbc97c1e24d86f34a5a5`, limited to runner discovery,
selected-runtime testing and saved execution/session preservation. The original
baseline source and review depth remain unchanged for unrelated operations.

## `availability`

Review: `baseline`.

API: `present` — representative operation IDs:

- `GET /api/adapters`.
- `GET /api/companies/{companyId}/adapters/{type}/models`.

Agent access: `partial` — Agent company-model API and bound runtime context; board
adapter/account inventories.

Policy: Run/cost visibility and agent configuration policy; adapter installation/account
login/session control require board/admin.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L6608) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Runner discovery exposes `supportedRunners` and `defaultRunner`; it describes
qualified selection, not successful authentication or task execution. Native
Claude retains existing account grants and company/responsible-user boundaries.
Source: [adapter discovery](../../server/src/adapters/registry.ts).

Gaps: Raw instance adapter listing requires board, while company model discovery exists
for eligible agents.

Scoped source-only evidence: [adapter discovery](../../server/src/routes/adapters.ts)
reports supported runners/effective default for the selected company/environment;
[selection policy](../../server/src/services/agent-runner-selection.ts) reads
server-owned immutable sandbox facts without provisioning. New Codex defaults
and explicit overrides follow the [shared runner contract](../../packages/shared/src/agent-runner.ts);
Claude follows its qualified rollout described above. The board inventory does not grant a
native agent an equivalent discovery binding. See
[probe restrictions](./execution-environments.md#probe) for acquiring qualification.

## `validation`

Review: `baseline`.

API: `present` — representative operation IDs:

- `POST /api/companies/{companyId}/adapters/{type}/test-environment`.

Agent access: `partial` — Permitted agent-creation validation path / REST / CLI;
operator account login.

Policy: Run/cost visibility and agent configuration policy; adapter installation/account
login/session control require board/admin.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L6608) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Environment test path checks creation/configuration policy; missing provider auth
must use its owner setup flow.

Scoped source review: [test authorization and resolution](../../server/src/routes/agents.ts)
requires same-company `agents:create`, saved-agent update access when supplied,
allowed environment selection, and normal secret/responsible-user checks. An
unchanged saved runner avoids new-creation policy but still receives selected
runtime validation. [Native readiness](../../server/src/services/native-runtime/setup-readiness.ts)
tests native Codex startup/model/account and bounded teardown; an authentication
or Legacy CLI check cannot replace that runtime evidence. Missing dependencies,
credentials, invalid models and incompatible settings fail without silently
changing runners. Account login remains board/owner-bound.

Verification for this scope remains `not-run`: use an admitted agent REST/CLI
validation path, assert missing grants and cross-company targets/accounts are
denied, then prove the useful task/follow-up separately. `hire_agent` inherits its
caller's runtime; do not assume its binding accepts arbitrary runner or account
settings. See [creation access](./agents.md#hire).

## `runs`

Review: `baseline`.

API: `present` — representative operation IDs:

- `GET /api/heartbeat-runs/{runId}`.
- `GET /api/heartbeat-runs/{runId}/log`.

Agent access: `available` — REST / native call_api / CLI run.

Policy: Run/cost visibility and agent configuration policy; adapter installation/account
login/session control require board/admin.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L6608) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Provider trace reveals/downloads require instance-admin and cannot be counted as
ordinary run output access.

## `session`

Review: `baseline`.

API: `present` — representative operation IDs:

- `POST /api/agents/{id}/runtime-state/reset-session`.
- `GET /api/agents/{id}/task-sessions`.

Agent access: `restricted` — Board session controls; native server-owned session
continuation.

Policy: Run/cost visibility and agent configuration policy; adapter installation/account
login/session control require board/admin.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L6608) at
the reviewed commit above.

Verification: `not-run` — assert the documented agent denial with an owned test fixture;
verify any listed agent request/result path separately. A delegated operation needs its
own policy and access review.

Gaps: Execution context reset is not a permitted generic native API mutation or an
ordinary agent management path.

Scoped source-only evidence: [configuration changes](../../server/src/services/agent-configuration.ts)
and [native execution/recovery](../../server/src/services/native-runtime/native-session-executor.ts)
retain existing execution on unrelated edits and use recorded run configuration
for active/recovered runs. Explicit runner changes use revisions and session
invalidation. Verify saved configuration, current versus historical run identity,
restart and follow-up without granting session-reset authority to an agent.

Scoped source-only evidence: the
[native transport](../../packages/paperclip-runner/src/live/runnerd-codex-transport.ts)
joins owned startup before certifying cleanup. Unconfirmed preparation or
registration retains recovery state; late registration may retire only its own
route and cannot launch a provider after close. This does not grant an agent
account-setup, cleanup-override or session-reset authority. Verify the no-provider
ownership controls independently from installed/live provider acceptance.

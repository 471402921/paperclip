# Hiring, agent configuration, and organization — agent access

Product map: [Hiring, agent configuration, and organization](../feature-map/agents.md).

Review date: 2026-10-12. Source commit: `f981fa3cc10cb8663a87dec60345fbff46d54d0a`.

This is a source-reviewed baseline of representative operations and known gaps.
Each capability needs operation-level review before its entire scope can be
qualified. No live agent execution is claimed. Follow the [map contract](../README.md)
for format, permission checks, evidence and maintenance.

Scoped runner-default source review: 2026-10-12 at
`eee0534154eaf5d0d3f2bbc97c1e24d86f34a5a5`, limited to creation/configuration,
approval activation, built-in provisioning and import preservation described
below. The original baseline commit above still governs unrelated entries; this
update does not claim operation-complete review or live agent verification.

## `hire`

Review: `baseline`.

API: `present` — representative operation IDs:

- `POST /api/companies/{companyId}/agent-hires`.
- `POST /api/companies/{companyId}/agents`.

Agent access: `partial` — Native hire_agent; REST / CLI agent; runtime inheritance for
native hires.

Creation requests can use `runner: auto | paperclip | legacy`; the server resolves
and persists execution configuration. Claude Auto selects the native ACPX profile
on qualified Apple Silicon; saved runner/model/provider overrides survive edits
and approval activation. This selection does not grant connection access or
bypass hiring authorization. Source: [runner resolver](../../server/src/services/agent-runner-selection.ts).

Policy: Agent creation/configuration uses action grants, resource policies and change
consent; some controls require a board actor.

The creation boundary resolves the request-level runner before adapter validation
and credential normalization. Omitted/automatic new Codex selection uses the
qualified target's default; explicit Legacy is retained. Disabled adapters and
external overrides affect new selection, while missing credentials/runtime or
incompatible settings remain errors. Existing agents and reviewed pending hires
retain their recorded execution. Native `hire_agent` explicitly inherits its
caller's runtime and remains subject to permission and credential restrictions;
it is not an arbitrary host-configuration or login tool. REST/CLI creation and
hire runner options use the [shared request contract](../../packages/shared/src/validators/agent.ts).

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L1395) at
the reviewed commit above.

Scoped Evidence: `source-only` — [creation policy](../../server/src/services/agent-hiring.ts),
[runner resolution](../../server/src/services/agent-runner-selection.ts),
[native hire binding](../../server/src/services/native-runtime/paperclip-runner-tool-authority.ts),
[frozen approval activation](../../server/src/modules/agent-lifecycle/adapters/approvals.ts)
and [same-harness import preservation](../../server/src/services/company-portability.ts)
at the scoped commit. No permitted-agent journey was executed for this map update.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

For this scope, compare automatic and explicit Legacy creation, assert foreign
company/environment and missing-grant denials, then compare pending approval
configuration across restart and activation. An unrelated edit/import update must
not change existing execution; a new package without a runner choice receives
creation defaults. Do not count a board call or component test as agent evidence.

Gaps: Identity/persona hiring works. Operator account login and sensitive
adapter/environment configuration are separate guarded actions.

The runner request does not grant new account, environment-probe or native API
fallback authority; see [validation access](./runs-adapters.md#validation) and
[environment administration](./execution-environments.md#probe). Full access
qualification remains not run.

## `instructions`

Review: `baseline`.

API: `present` — representative operation IDs:

- `GET /api/agents/{id}/instructions-bundle/file`.
- `PUT /api/agents/{id}/instructions-bundle/file`.

Agent access: `available` — Native read/update/history/restore instruction tools; REST /
CLI.

Policy: Agent creation/configuration uses action grants, resource policies and change
consent; some controls require a board actor.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L1395) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Canonical entry file, revision guard, company boundary, and protected-change
policy apply.

## `organization`

Review: `baseline`.

API: `present` — representative operation IDs:

- `GET /api/companies/{companyId}/org`.
- `PATCH /api/agents/{id}`.

Agent access: `available` — list_agents/get_agent; native call_api for permitted
configuration fields; REST / CLI.

Policy: Agent creation/configuration uses action grants, resource policies and change
consent; some controls require a board actor.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L1395) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Reporting-line changes need configuration authorization; a title alone gives no
authority.

## `lifecycle`

Review: `baseline`.

API: `present` — representative operation IDs:

- `POST /api/agents/{id}/pause`.
- `POST /api/agents/{id}/resume`.
- `POST /api/agents/{id}/terminate`.

Agent access: `partial` — REST resume under change grant; pause/terminate require board;
native call_api blocks all three.

Policy: Agent creation/configuration uses action grants, resource policies and change
consent; some controls require a board actor.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L1395) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Resume is agent-eligible but lacks a default native binding. Pause and termination
are actor-boundary decisions.

## `built-in`

Review: `baseline`.

API: `present` — representative operation IDs:

- `POST /api/companies/{companyId}/built-in-agents/{key}/provision`.

Agent access: `partial` — REST / native fallback for eligible provisioning; built-in
routine controls require board.

Policy: Agent creation/configuration uses action grants, resource policies and change
consent; some controls require a board actor.

Evidence: `source-only` — [implementation](../../server/src/routes/agents.ts#L1395) at
the reviewed commit above.

Verification: `not-run` — exercise a listed permitted operation with actual agent
credentials/run context; inspect its result and applicable persistence/attribution.
Assert the relevant denied actor, owner, company or mode from Policy. Review the
remaining operations before qualifying the whole capability.

Gaps: Provisioning checks agents:create. Enabling/running its built-in routine is not
the same permission path.

Scoped source review: [built-in provisioning](../../server/src/services/built-in-agents.ts)
recognizes the underlying Codex harness of a native company agent. New configured
provisioning resolves the runner, while unrelated reconciliation and same-harness
edits retain existing execution. Verify explicit runner changes preserve compatible
saved settings; the general creation/access policy above still applies. This is
source-only evidence at the scoped commit, not a live provisioning result.

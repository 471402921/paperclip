# Claude runner defaults

Updated 2026-10-12.

## Outcome and constraints

Start from `058af8f1b69c5fa3d9bc974b9eab73c141b52823`; branch `codex/claude-runner-default`, checkout `/Users/dotta/.codex/worktrees/670b/paperclip`. New Claude agents eventually default to native ACPX Claude on Apple Silicon, Intel Mac, Linux x64 and Linux ARM64. Codex ARM64 defaults remain unchanged. Ordinary Claude defaults become Opus 5.5; explicit models and existing runner selections remain intact.

Local Apple Silicon API-key task and follow-up are the first gate. Keep existing connection/login tools. Complete core settings and local subscription next, then package/qualify other targets. Two reviewable PRs; no merge or deployment. Linux ARM64 covers installed hosts and SSH, not ARM cloud images. Separate $50 Claude ceiling including setup probes, unknown-charge holds and task turns. No automatic paid retry loops. Docker and expensive Rust builds run in cloud infrastructure; never build Docker images on this Mac.

## Current state

- Reviewed source chat “Make Paperclip Runner the default”; source worktree remains separate and active.
- Isolated feature branch starts at the exact requested SHA.
- Workspace dependencies installed with pinned pnpm 9.15.4 and lifecycle scripts disabled.
- Local key source exists; no credentials retained here.
- Verified baseline Apple Silicon daemon is available at `/private/tmp/pr2-d522-mac-remote-daemon/darwin-arm64/paperclip-runnerd`; use its receipt and digest for phase 1.
- Local default selection, narrow experimental-gate graduation, Opus defaults, and shared runner UI are being implemented. Claude effort transport and acknowledgment are being implemented; the live milestone used default effort on the unchanged baseline daemon.

## Remaining gates

1. Local API-key onboarding/task/follow-up passed; retain evidence while runtime components change.
2. Core settings propagation, all preservation paths, subscription acceptance.
3. Four-target package and remote proof; enable additional defaults only after qualification.
4. Required checks, final-source review, PRs, inspectable evidence and working preview.

## Budget

Ceiling: $50. Two successful API-key task turns and one successful built-in setup probe. Retain $8 for the initial unpriced receipt/setup uncertainty, plus an $8 additional billed-spend allowance with hard stops and no automatic paid retries; total conservative hold/allowance $16. The follow-up estimate consumes $0.269886 of that additional allowance. These are qualification estimates/reservations, not provider invoices.

## Local API checkpoint

Source base plus uncommitted feature changes; preview `http://127.0.0.1:3105`, isolated home `/private/tmp/claude-runner-default-qa`. Initial CLI seed and ordinary UI creation both saved native Claude / Opus 5.5. Native experiment was disabled before UI setup and task. Existing setup tools succeeded using the verified SDK CLI 2.1.286 in this instance-only PATH; global CLI 2.1.245 was insufficient for Opus 5.5 and was not modified. PostgreSQL install required local postinstall links/signature repair after lifecycle-disabled installation.

UI agent `a0e75080-86de-427a-8ac3-3743c6d076ae`; task `CLA-1`, `6ddff45d-9974-4bd6-976a-f586393ed8f5`. First native run `42773dcb-cbb2-4deb-a495-ca5b3f451780` succeeded with `acpx_runtime` and observed model `claude-opus-5-5`. Independent attachment download: 125 bytes, sha256 `839680679537dfcc8700661347623f0fc1eef7a35e4593dd851a1389bbdc14fc`, three requested checklist items.

The run exposed missing Opus 5.5 pricing. Its immutable receipt remains unpriced, with reported input 15611, cache-write 15599, cached-input 135871 and output 2194 tokens. Preserve an $8 hold. A narrow rate-card addition uses official standard rates 4 / 0.2 / 8 (one-hour cache-write upper bound) / 20 USD per million; first-run independent upper-rate estimate is $0.1958942, not an invoice. Both QA policies blocked unpriced usage and paused after completion. Before the follow-up, retain the $8 hold as explicit policy reservation, allow the known historical unpriced receipt only in these disposable QA policies, keep the $8 additional billed-spend hard stop and no automatic paid retries. Total conservative hold/allowance $16 of the $50 ceiling. No historical receipt is rewritten.

Checks: 66 selection/model tests, 111 agent form tests, 78 other affected UI tests, UI/server noemit and token gates passed. Native eligibility regression passes; Opus pricing check passes after the provenance formatting correction. The mocked route suite subsequently passed 47 tests with localhost access enabled; the initial timeouts came from sandbox listener restrictions.


Follow-up run `60e7f9a2-aff3-40b3-8493-2ede6c59da72` succeeded after a controller restart. The task session was reused and the observed model remained Opus 5.5. Estimated Anthropic API usage: `$0.269886000`. Second attachment is 178 bytes, sha256 `ae6fad75dfa46c4c444ad203dff8029359721e19249c04ec1faba9eb6c3d3341`, preserving the first three items and adding the requested revision. Independently re-downloaded the original after the follow-up and confirmed it remained unchanged. Both runs reached Done; saved agent configuration and native experiment=false persisted across restart.

Product evidence: [task and both downloadable artifacts](http://127.0.0.1:3105/CLA/issues/CLA-1), [first artifact](http://127.0.0.1:3105/api/attachments/3b1b6033-78b4-4a0b-99ae-de363d7f5071/content?download=1), [revision](http://127.0.0.1:3105/api/attachments/857add4a-ef8c-4146-b9c5-be9affc32565/content?download=1). Sanitized receipt: `/private/tmp/claude-local-api-acceptance.json`.

Runtime: daemon source `d522822a5daeb72d124360b576b82a8bb52b43f4`, executable sha256 `d0656673f7b6dfa6f2554fac18f3e0b42e2eb10f444b06f6063255335d71aa14`; SDK CLI 2.1.286 sha256 `75e3016e9d2570767b08e43a7467d4817a4f149232c169ca295f2c95fef21433`. The planned effort transport changes require a new remotely built daemon and affected acceptance reruns; they are not covered by this baseline-runtime evidence.

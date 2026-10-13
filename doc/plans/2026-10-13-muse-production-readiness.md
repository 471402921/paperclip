# Personal Muse production readiness

Date: 2026-10-13. Owner: this integration task. This updates the accepted Muse plan and October 10 architecture against origin/master `833769ab557255b11dd8f650f43ed7333653f5e4`.

## Release contract

| Area | Required outcome / boundary |
| --- | --- |
| Bot and identity | Existing personal Meta Muse at muse.ai; a named company agent with a separately recorded authorizing user. |
| Release targets | Public HTTPS self-hosted instances and Paperclip Cloud using ordinary managed Runner execution. No control-plane execution fallback. |
| Assignment journey | Ordinary assignment wakes Muse, authenticates and claims once, uses its own relevant native tools, publishes an inspectable document, and finalizes through the native Runner. |
| Idle journey | A fresh Muse conversation discovers the installed client, reads permitted company work, creates governed intake without a human placeholder task, and returns useful attributed work. |
| Human setup | Invite → copy current setup instruction → hostname approval in Muse → watched pairing/receiver/authenticated reply milestones → Done. No cookie export or manually copied durable API key. |
| Credentials | Single-use 10-minute pairing feeds a dedicated Muse OAuth authorization. Secure Vault/authd owns public-client DCR, PKCE S256, 15-minute access and rotating refresh with 30-day authenticated inactivity expiry. The worker uses credential surrogates and stores no raw tokens. Public polling never extends credentials. |
| Public receiver | Explicitly approved by the user on October 13. Nonsecret binding UUID selects an opaque wake-presence signal. No task text, global cursor, credentials, or assignment authority. All worker operations remain authenticated. Public contact cannot establish readiness. |
| Provider placement | Muse owns its personal model and tools. One admitted assignment uses the shared external Runner. Idle connection traffic allocates no Runner. Paperclip workspace/shell and third-party gateway tools remain deferred. |
| Delivery and recovery | One active assignment; stable request/event identities; current company/agent/authorizer/run checks; unknown effects require reconciliation; controller restart must preserve original identities. |
| Stops and cleanup | Fence authority immediately; best-effort remote stop with explicit confirmed/unconfirmed evidence; uncertainty blocks automatic overlap/retry. Disconnect disables the receiver and reports unreachable cleanup honestly. |
| Capabilities and costs | Required first-party task/document/questions/collaboration/intake tools. External Muse usage/cost unavailable unless reported; existing budget/approval gates remain. |
| Qualification bound | New 24-hour campaign, at least 20 unattended samples and at least two sustained idle hours. Request five-second hooks; at least 90% measured steady gaps ≤7 seconds and no gap >1 minute. No silent 60-second fallback. |
| Evidence | Separate scripted, actual Muse, local native Runner, managed Linux artifact, and deployed-tenant results. Preserve failed attempts, operator nudges, exact revisions, latency, and cleanup. |
| Rollout | Default off until selected gates pass. Prepare reviewable app, ingress, and Runner artifacts; verify the real staged serving revision before production rollout approval. |

## Delivery sequence and acceptance matrix

| Gate | Existing evidence | Required action / next evidence |
| --- | --- | --- |
| Current master integration | October 10 stacked PRs and two scripted native runs; stale for current source | Reconcile task-workspace/heartbeat extractions, migration numbering, authorizer and skill-test JWT scope; preserve Dot compatibility. |
| Real receiver feasibility | Four old 60-second replies; old experiment stopped. October 10 hooks forbid secrets and accept no script arguments. | Publish a new immutable asset version, install a no-argument secret-free receiver, authenticate a fresh readiness challenge on current Muse. |
| Natural onboarding | Existing invite/settings components and stories; simulated and browser evidence | Fresh invite, expiry/renewal, reload/resume, hiring approval, site permission, current challenge, readiness and Done on actual candidate. |
| Both work directions | Scripted task/document/question/follow-up proof, no actual Muse run | Actual research/document task using Muse tools; Paperclip clarification answer; follow-up; fresh-conversation proactive intake with no queued task. |
| Correctness/recovery | Existing protocol/client/authority/Rust tests and failure evidence | Duplicate/lost responses; competing claims; pause/reassignment/cancel; actual controller restart; credential refresh/replay/revocation; stopped-run authority and cleanup. |
| Cloud/installed artifact | Cloud PR731 exact bounded routing; no deployed Muse proof | Current ingress parity/header tests; normal Linux packaged Runner capability; named synthetic staging tenant through ordinary managed execution and real serving digests. |
| 24-hour reliability | Not run; prior experiment is not reusable qualification | Freeze candidate; bounded unattended monitor with deterministic samples, cadence and queue-to-claim/full-response timings; report incomplete evidence and owned-resource cleanup. |
| Review and release | Previous draft PRs were green/5of5 on old heads | Current targeted checks → required full checks/token gates → current-head CI/review. Keep manageable logical PRs/dependencies. Separate review-ready, qualified, merged, deployed, and canary-verified. |

Next critical-path gate: reconcile current master and implement the approved receiver boundary, then prove the actual personal Muse readiness round trip before broadening the live campaign.

The previous receiver test remains stopped. No October 10 scripted evidence establishes actual Muse execution, first-time onboarding, Cloud deployment, or unattended reliability. Existing credentials and private fixture data are never copied into this plan or public PRs.

## Current provider evidence and architecture correction

October13 actual personal Muse read-only probes reconfirmed five-second secret-free no-argument hooks. Persistent skills live at `~/workspace/skills/paperclip-muse/SKILL.md` and are discovered by `muse.skill_search` from fresh side conversations.

The production credential contract is Secure Vault/authd. The old0600 test credential file is an explicit test exception, not production setup. Muse reports supported `credentials.request_api_access` public-client OAuth2/DCR/PKCE and automatic refresh; a worker obtains only `hsurr` surrogates through the bundled `dynamic_credentials.py` helper, with Sentinel substituting the real access credential during approved egress. There is no supported direct pairing-token injection into Vault.

Decision: reuse the existing OAuth engine with an explicit Muse agent profile and one nullable binding-to-grant link. Keep Muse commands/queries and native authority separate from personal MCP and Dot identity. Preserve Dot refresh behavior. Add only exact OAuth endpoints under the bounded Muse namespace, and use the operator's one-use pairing ticket for exact company/agent/authorizer authorization.

Strict disconnect and explicit OAuth revocation invalidate the grant immediately. Post-revocation authenticated cleanup cannot be promised with the supported single Vault credential. Public410 disables the detector; stopping/cleanup stay unconfirmed without provider observation or exact operator attestation. Run-level fencing while the connection is live still supports authenticated control receipts. No cleanup credential is written to files and revoked OAuth authority is never revived.

Next critical gate is supported authd OAuth bootstrap plus the secret-free receiver on actual Muse. Simulated private-file client tests remain labeled deterministic compatibility evidence only.

## October 13 implementation checkpoint

The fresh candidate uses master `833769ab557255b11dd8f650f43ed7333653f5e4`.
Five additive migrations 339–343 preserve the master journal prefix and the four
previous Muse migration SQL identities. The fifth links an exact OAuth grant.
Master's workspace/instruction preparation stays excluded for external providers.

Local verification: 213 targeted Runner/runtime tests, rebuilt debug Runner
capability metadata, server/UI typechecks, HTTP privacy 79 cases, connection UI,
and token gates passed. Cloud ingress matches 20 exact Core routes; its full suite
passed 3260 tests with 92 intentional skips, plus local QA smoke. These checks are
synthetic/local, not actual Muse or deployed managed-runtime proof.

Review exposed OAuth lock-order and revocation-window races. The candidate now
uses admission/binding locking for OAuth lifecycle, validates credential authority
inside guarded idle writes and native dispatch, and reconciles revoked grants.
OAuth concurrency and regression checks remain in progress. No new hook has been
installed; the previous experiment remains stopped.

The disposable authenticated qualification company is isolated from the primary
instance. The next provider gate is authd Connect, including preservation of the
pairing-ticket query, a surrogate-authenticated read, then an independent receiver
reply. Do not begin the 24-hour clock before the candidate and receiver are frozen.

The operator approved the complete bounded public protocol on October13.
The dedicated `/api/muse/v1` route is now installed on the existing HTTPS8443
service; all unrelated Tailscale configuration was verified unchanged. Muse's
OAuth grant is not yet installed. The final control checks passed51 Muse cases,
101 existing Dot/personal OAuth cases,23 supported-client cases and11 protocol
cases. The rendered expiry journey revealed a missing Reconnect action, now
covered by the actual invitation component regression. UI checks passed27 cases.

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

Next critical-path gate: establish explicit standing delegation in onboarding,
then prove actual autonomous acceptance and completion before the live campaign.

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

## Actual provider checkpoint, October 13 at 17:26 UTC

The current source candidate is `51ad4ba59021d5d281736b4c5d4d541d58036aea`,
following integration commit `f6285c7b5a0a82b5cbba53ea67ab18bc99426eee`.
The later change surfaces Vault Connect in the current Muse conversation before
background installation; it does not alter the immutable receiver asset2 bytes.

The first actual installation attempt created a visible background task but
made no observed installation, credential request, or hook progress. A read-only
operator status inquiry after approximately ten minutes found no active worker,
installed files, or new hook. That attempt is failed/assisted onboarding evidence,
not an unattended success. Its expired one-use ticket was replaced normally.
One subsequent ticket expired while its Connect action was pending; it was also
replaced through the ordinary connection API.

An explicit current-conversation credential request then completed Muse's normal
Vault Connect flow. The user authorized the agent to perform the test connection
consent. Authd preserved the pairing-ticket query and supplied its actual callback,
public-client registration and S256 PKCE. Paperclip observed an active credential
for the intended disposable company and named agent at 17:26 UTC. No credential
was exported from Muse, copied manually, or written by the worker. This establishes
actual supported OAuth bootstrap, not yet a surrogate-authenticated worker read,
background reply, task execution, or unattended first-time setup.

The native smoke fixture also passed two scripted assignments on the integrated
candidate: document publication, structured clarification/answer consumption,
native finalization and follow-up. Its first attempt failed because the Runner
WebSocket resolved to a public hostname exposing only the approved Muse routes.
The fixture was repaired using the existing `PAPERCLIP_API_URL` loopback setting;
no new public Runner route or provider fallback was added. A fresh ordinary run
then passed. These remain local synthetic results, separate from personal Muse
and managed Cloud qualification.

The required full Core test suite is still running. Updated reviewable PR slices
are being reconstructed on the frozen master cutoff. The five-second receiver,
real work in both directions, deployed managed artifact, and new 24-hour campaign
remain release gates. The previous experiment remains stopped.

## Actual provider checkpoint, October 13 at 18:44 UTC

Serving source `d80cca8d7ec2d5e19f8396b6b563acf515f1a48b` publishes immutable
asset3. Core and Cloud match 24 bounded protocol routes. Full workspace typecheck
and build passed on this source. Required full tests have retained failures in
unchanged baseline suites; focused reruns passed where recorded, but the complete
run is not green. Remaining serialized phases are still being executed.

The actual Secure Vault grant completed an authenticated scoped identity read.
Aggregate metadata also proves a rotating refresh and a 900-second maximum
access-token lifetime. Neither raw credentials nor surrogate headers were
exported. Early network reads required normal provider approvals and exceeded
the old 30-second timeout. Asset3 adds a bounded 120-second preflight and an
honest timeout/permission-wait diagnostic. A manual server restart and approved
provider permission actions are recorded setup interventions, not unattended
first-time onboarding evidence. Muse's actual Always allow card covered the
parent domain and subdomains; the setup now warns about the displayed scope.

Muse installed the five-second managed hook, persistent skill, and asset3 client.
A subsequent independent detector wake confirmed the authenticated readiness
challenge at 18:23:47 UTC. Paperclip observed paired, receiver detected, and
background reply verified separately. This establishes actual background
connectivity, not full task execution or proven effective five-second cadence.

The first real research/clarification assignment was queued at 18:30:22.994 UTC
and offered 2.096 seconds later. Muse woke and read the authenticated offer, but
asked for fresh permission to accept. There was no claim, native acceptance,
document, question, or result. The normal deadline fenced the assignment and
failed its native run at 18:40:24.485 UTC. Muse then observed the revocation and
reported no work. No admitted effects or uncertain-operation holds were present.
This is a failed unattended acceptance attempt; it is not a successful sample.

Diagnosis: setup clearly says signals and offers do not grant execution authority
but does not clearly grant standing permission to request native acceptance.
Correct onboarding must authorize autonomous receipt, validation, and acceptance
for the exact company and named agent. Work still requires the native accepted
receipt and current lease; task content cannot expand delegation or override
Muse's own permissions. Publish corrected instructions as asset4 without changing
asset1–3 bytes. Deliver this authorization to the existing test connection as a
recorded onboarding repair, then test a fresh assignment without a chat nudge.

Review also found a resumed-hire retention defect and missing agent-attributed
readiness/cleanup activity history. Fixes and regression checks are in progress.
The task thread must show Waiting for Muse until native acceptance rather than
implying the worker is thinking.

The new 24-hour test has not begun. Actual work in both directions, clarification,
follow-up, effective cadence, managed Linux execution, and deployed tenant proof
remain release gates. The old experiment stays stopped and the provider stays
experimental/default off.

## Asset4 assembly and prequalification repair

Asset4 adds exact company/agent standing delegation, binding-specific persistent
skills and authenticated installed-version reporting. Historical asset1–3 bytes
are unchanged. Muse acknowledged a direct scoped user authorization at 19:14 UTC
and reported no inline mailbox read, claim, or challenge acknowledgement. This is
a recorded onboarding repair, not a successful task or qualification sample.

The final stack also retains resumed invitations after readiness, audits
readiness/cleanup with the named agent and authorizing person, and displays
Waiting for Muse/Dot until native acceptance. Question sets share Runner's
196 KiB serialized UTF-8 bound. The five migration SQL files and original journal
timestamps are preserved, with coherent snapshot predecessors. No live database
reset or direct receipt edit was performed during assembly.

Prequalification receiver measurements over 20 minutes contained 214 contacts:
median gap 5.780 seconds, p90 6.126 seconds, maximum 7.584 seconds; 210 of 213 gaps
were at most seven seconds. This is promising cadence evidence, not the required
24-hour observation or a completed assignment.

The full frozen asset3 test coverage retains failed attempts. Its control file
passed 52 cases. Unchanged bounded reruns passed the invitation-list and native
bootstrap cases where recorded, while one pipelines case remains reproducibly
unresolved. A clean frozen-master baseline is being tested before attributing
that failure. The required final-candidate checks and live journeys remain open.


## Asset4 task and stopping checkpoint, October 13 at 20:11 UTC

Frozen `dc28979f7d5b7788d0598e0ea1f6e49a58381def` passed workspace typecheck
and build, 929 targeted Vitest cases and 29 Python cases. Its independent
asset4 readiness reply took 18.116 seconds. Historical onboarding interventions
remain recorded; this does not establish unattended first-time setup.

A fresh real task was queued at 19:43:28.861 UTC and offered 3.506 seconds later.
Muse claimed it at 19:45:43.230 UTC and received native acceptance 379 ms later,
without a chat nudge. Queue-to-claim was 134.369 seconds. Muse asked the required
structured question; the operator answered Engineering audience through Paperclip
at 19:55:51.903 UTC. The worker read and acknowledged the answer but reported
only the next steps. It never consumed that input, published the required memo,
or finalized. A premature native finish was rejected while input was pending.
This is incomplete prequalification, not a successful delivery sample.

The ordinary task Stop action cancelled the native run and fenced the assignment
at 20:09:18.225 UTC. Muse independently submitted the exact-boundary quiescence
report. Native effects were not uncertain. The connection reports worker_reported;
this does not confirm termination of every private Muse effect. No manual receipt,
claim, completion or operator stop attestation was fabricated.

Asset5 is a source correction, not yet qualified: its generic wake explicitly
loads the paired skill and executes/resumes in-scope admitted work rather than
ending at mailbox inspection. Canonical answers resume the same live assignment;
rejected premature completion does not revoke otherwise-current authority.
Historical assets1–4 retain their exact bytes; credentials, scope, native leases,
provider permissions and approval gates remain unchanged.

Current master cutoff is now `c7f4b74111d16f0b57112fa6d0b6a59c2d63bfe8`.
Master added migrations339–340. The Muse suffix is renumbered341–345 with exact
SQL hashes. A normal-engine rehearsal preserved all old history/grant/binding/
credential values, appended only the two missing master migrations, and matched
a fresh combined schema. No live database reset or receipt edits occurred.
Snapshots incorporate exactly the two new master table changes and retain five
newest snapshots. Normal Drizzle generation reported no extra schema migration.

Review race/replay fixes prevent a late send error from marking a settled receipt
unknown and prevent exact duplicate results from reopening a settled assignment.
A meaningful before/after regression reproduced three failures on old source and
passed all four cases after repair. Broader original Core failures remain retained;
the candidate's required full-check result is not green by inference.

The new 24-hour campaign has not begun. Real completed work, follow-up, proactive
intake, the updated receiver, current-head CI/review, managed Linux and deployed
tenant gates remain open. The old experiment stays stopped and Muse stays off by
default.


## Current-master assembly and asset6 repairs

The test fixture is deliberately offline during assembly. The persistent OAuth
grant, database and bounded HTTPS path remain intact. Asset6 has not yet been
installed in Muse. Its source uses immutable version-specific directories for
all six asset versions, with no mutable historical aliases. The client repairs a
crash between saving verified identity and publishing the persistent paired skill.
A definitively rejected premature finish can progress to a new completion phase
only after canonical input consumption; unknown or accepted effects retain their
original identities and are never blindly repeated.

Current admission rechecks the presented access credential after every lock wait,
before reserving new work. Durable reservations recover under current native and
grant authority without retaining an obsolete bearer across ordinary refresh.
Cancelled answers remain in audit history but do not appear as actionable pending
input. Qualification occupancy ends at recorded native termination and includes
independent stop/effect holds across reconnects; it cannot count unresolved remote
work as idle. Before/after cases reproduced eight product failures and passed the
repaired ten-case subset. All three assembled Muse server suites passed 78 Vitest
cases, including 68 control cases and the wrapper's 30 Python assertions. Server
typecheck and module boundaries passed; original failed attempts remain retained.

Task retry controls now treat waiting_for_provider as active execution, so a prior
failure cannot offer overlapping retry while Muse/Dot awaits acceptance. The full
TaskChatThread suite passed 229 cases. Storybook fingerprint changes are reviewed
against the fixed current-master cutoff; source-only review does not imply live
render or accessibility qualification. Fresh final renders remain a separate gate.

Cloud candidate 14ce9db6da196bbf27f35686475aa0cf8b3ee240 passed typecheck and the full
suite: 3,279 passed and 92 skipped. Its 36 exact protocol routes match Core manifest
71fc2c8550eb52fe4842d0ce4bde021ee0ad35d9eadaa7038316857a79b24b2b.
It depends on a separate conditional cleanup repair for a computer claim committed
after lease cancellation, before provider allocation. The repair preserves started
provider resources and replacement claims; no real provider allocation occurred.
Neither candidate is deployed to a managed Muse tenant.

The last real assignment remains incomplete and its worker_reported stop hold
is not released. Any release requires an honest ordinary exact-boundary operator
attestation. No new assignment or 24-hour campaign begins over that hold. The old
experiment remains stopped.


## Asset6 live failure and current-master repair, October 13 at 22:01 UTC

The frozen asset6 candidate was `7305efe445022205a6440ef8a6caa02460edba9d`.
Its independent authenticated background verification succeeded. A fresh real
research assignment was offered 3.120 seconds after creation and claimed after
103.649 seconds, with native acceptance another 431 milliseconds later. Muse
submitted the structured question. The operator answered through Paperclip.
The worker acknowledged the input notification but the answer helper failed;
there was no canonical consumption, published document, or native completion.
This is failed prequalification, not a reliability sample.

After ordinary Stop and task cancellation, Muse independently reported the exact
worker quiescent. The operator used the existing exact-boundary attestation to
release that hold. Independent private tools were not certified stopped. A
read-only diagnostic after cancellation requested only checkpoint shape fields.
Muse confirmed valid JSON object, with the helper's `inputs` field missing. No
checkpoint contents, credential files, Vault values or surrogate headers were
read. The diagnostic was an operator intervention, not unattended success.

The client and model shared the same continuation pathname. Immutable asset7
separates helper-owned input receipts from model-owned work state, preserving
legacy prepared command identities and failing closed on malformed helper
receipts. This correction and its live retry are still in progress. The fixture
is deliberately offline for source assembly; its database and OAuth grant remain.

The master cutoff has advanced to `edcfcaf3f69abfda12fcbc63225f7346f53450aa`.
New master migrations341–342 require the Muse suffix343–347. SQL identity,
applied history and credential values must be preserved by normal migration
reconciliation. Master's new Storybook annotations and ignored generated outputs
replace the obsolete aggregate catalog/fingerprint workflow.

Frozen7305 passed full workspace typecheck and build. The required local full
test command remains incomplete: owned embedded PostgreSQL initialization hit
host shared-memory limits, and one adapter-utils publication-race assertion
failed in the broader remainder. Both attempts and clean focused reruns are
retained. Source equality and a passing focused master case do not prove those
failures were inherited. No full-green local claim is made.

The frozen Linux Runner compiled and passed installed-package lookup/startup and
its network-disabled Muse native contract. A first twenty-minute packing attempt
was stopped at its bound; a separately bounded pack-only recovery passed using
byte-identical official pack/install/consumer function bodies. This is local
Linux emulation and synthetic protocol evidence, not a deployed managed tenant
or personal Muse task completion. New master contains no Runner/Rust/eval source
changes, to be rechecked on assembly.

Next critical gate: freeze asset7 on the fixed current-master stack and complete
the real research/document/clarification task. Follow-up and fresh-conversation
proactive intake must then pass before starting the new24-hour campaign. The old
experiment remains stopped, Muse remains experimental and disabled by default,
and no Cloud tenant or production rollout is claimed qualified.

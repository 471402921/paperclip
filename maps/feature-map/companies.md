# Companies and portability

An operator can switch between companies, change their identity and settings, archive them, and preview an import or export. Each company remains a separate scope for work and agents.

Implementation: [companies](../../ui/src/pages/Companies.tsx), [settings](../../ui/src/pages/CompanySettings.tsx), [import](../../ui/src/pages/CompanyImport.tsx), [export](../../ui/src/pages/CompanyExport.tsx).

Agent access: [companion](../agent-access-map/companies.md).

## Sub-features

- `selection`: create/select a company and keep navigation in its scope.
- `identity`: update company identity and configured settings.
- `decision-models`: configure and test the company's decision model, then inspect invocation history and recorded usage.
- `fast-responses`: configure and test the experimental fast-response service, then inspect acknowledgement history, failures, and recorded usage.
- `archive`: archive and restore through the available controls without confusing archival with deletion.
- `portability`: preview a company package and inspect imported agents, projects, skills, and conflicts.

## How to get to it (user POV)

### `company-switcher`

Use the company switcher or `/companies`, then enter company Settings.

### `package-transfer`

Use `/company/export` and `/company/import` where enabled, or the corresponding CLI company commands.

### `company-ai-services`

Use Settings → Connections (`/company/settings/connections`) when fast responses
are enabled. Otherwise decision-model settings remain in Company Settings.
Open the Decisions and Fast responses tabs in Costs to inspect invocation history.

## Driving it with Playwright and the Paperclip CLI

Preconditions: follow the [baseline](./README.md#before-driving-a-journey). Use two disposable companies and a small package fixture. Record cloud-managed restrictions and visible settings gates.

### `company-switcher`

Automated: [company list](../../ui/src/pages/Companies.test.tsx) and [archive UI](../../ui/src/pages/CompanySettingsArchive.test.tsx) cover UI behavior with mocks.

Manual: Create or select a company, rename it, and reload. Switch to the second company and back; verify tasks, agents, and settings follow the selection. Archive the disposable company and verify its visibility and offered restoration path.

### `package-transfer`

Automated: [portability routes](../../server/src/__tests__/company-portability-routes.test.ts) and [CLI import/export](../../cli/src/__tests__/company-import-export-e2e.test.ts) cover package and command behavior, not every external Git host.

Manual: Export a small company, inspect the package preview, and import into a disposable target. Verify counts, references, conflict choices, and agent configuration. Run one imported task after supplying its required local credentials. Confirm source company data is unchanged.

### `company-ai-services`

Automated: [decision settings](../../ui/src/components/decision-models/DecisionModelSettings.test.tsx),
[decision history](../../ui/src/components/decision-models/DecisionHistory.test.tsx),
[fast-response settings](../../ui/src/components/fast-responses/FastResponseSettings.test.tsx),
[decision service](../../server/src/__tests__/decision-models.test.ts), and
[fast-response service](../../server/src/__tests__/fast-responses.test.ts) cover
component and service contracts with simulated providers.

Manual: As an authorized connection manager, select a disposable shared AI
connection, save the provider/model and sponsorship options, reload, and run the
bounded Test action. Inspect success and failure receipts and their history in
Costs. Verify disabled or revoked connections remain clear and that a user
without connection-management permission cannot configure or test the service.
Use an owned provider fixture for failure states; record any actual provider usage.

## Gotchas

- Restore an archived company through `/companies` → its menu → **Unarchive**.
  Archiving pauses eligible agents and cancels active runs; restoration handles
  agents paused specifically for company archival.

- Package presence does not prove a runnable imported company; credentials and environment bindings need separate verification.
- Company deletion is a distinct gated operation; do not use it as the archive test.
- Settings hidden in a managed deployment should be recorded as unavailable, not bypassed.
- Decision tests and fast responses have different request and execution contracts.
  A fast-response receipt is an acknowledgement, not completed agent work.
  History visibility and connection-management authority are separate; task links
  in history also require access to the underlying task.

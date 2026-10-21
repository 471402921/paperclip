# Paperclip Notebook

Paperclip Notebook uses the standard remote HTTP MCP connection, authorization-code OAuth with PKCE, Dynamic Client Registration, and the existing instance credential vault. Hosted and self-hosted Paperclip use the same protocol. Cloud broker enrollment is unnecessary.

The Notebook service belongs to the Paperclip Cloud repository and authenticates users with Cloud. A Notebook OAuth grant authorizes resource operations; it is separate from the user's Cloud browser session.

## Connector boundaries

Notebook's remote tools use the existing MCP connection and action gateway. Page ownership, publishing, sharing, version history, and reader policies belong to the remote Notebook service.

The catalog declares its hidden experimental feature. Shared setup, discovery, and dispatch evaluate connector availability from this metadata and the saved application identity. They do not identify Notebook by tool name or endpoint.

OAuth uses the existing generic MCP flow without connector-specific account lookup or token recovery. Notebook-specific publishing, upload tickets, and operation receipts live in `server/src/services/connectors/paperclip-notebook/`.

The optional workspace publisher is a connector-owned contribution. Its upload protocol, operation receipts, and signed-ticket validation stay in the Notebook module. Shared runtime code supplies approved workspace access and connection-scoped tool calls. The gateway's private connector-transfer channel checks the current run and action policy, then delegates temporary capability projection to a trusted adapter. It does not interpret Notebook manifests or tool results.

## Internal experimental rollout

The curated Notebook connector is off by default behind `enablePaperclipNotebook`. This internal flag has no control in Settings, including developer mode. Paperclip operators can enable it through the existing managed configuration (`PAPERCLIP_MANAGED_CONFIG`, `features.enablePaperclipNotebook: true`); self-hosted operators can use the existing instance experimental-settings API. Ordinary Cloud tenant settings writes remain protected by the fleet's hidden-settings policy, and the flag is excluded from staging tenant opt-ins.

While disabled, Notebook is absent from Browse and agent connection discovery. New setup, resume, reconnect, OAuth completion, and connection finalization are denied. Existing Notebook tools and both local publishing helpers stop through the current server gateway checks; already open native runs cannot use a pinned catalog to continue publishing. Local connection removal and grant revocation remain available. This gate applies to the curated Notebook connector and its helper, and does not restrict independent generic remote MCP endpoints.

## Deployment configuration

Notebook uses the canonical `https://notebook.paperclip.app/mcp` endpoint on hosted and self-hosted Paperclip. No per-instance registration or endpoint override is required. The catalog describes connection support; it is not a live service health check. Deploy and verify the canonical service before release. Uploaded applications use the isolated `paperclipnotebook.com` content domain.

The endpoint must provide OAuth discovery, registration, code exchange, and refresh. Its requesting client needs no pre-created secret. Discovery never expands the reviewed scope set:

- `notebook:read`
- `notebook:write`
- `notebook:share`
- `notebook:delete`

All four are requested by the standard connection. Sharing includes making a page public and visible in Explore. Assigned agents use the saved personal account; Notebook authorizes page management against that Cloud user's ownership. Paperclip retains its ordinary agent assignments and Allowed / Ask first / Off action policies.

The connection keeps Paperclip's default catalog name; setup does not derive a label from the account email. `notebook_get_account` remains an ordinary MCP tool for inspecting the connected account. Reconnect keeps the connection, assignments, and saved action restrictions.

## Publishing files

Ordinary MCP clients can publish small inline files with `notebook_publish`. Large files use `notebook_begin_upload`, narrowly scoped upload tickets, and `notebook_finalize_upload`. The remote server cannot read local filesystem paths. Upload tickets authorize only the declared quarantine objects; do not log them or treat them as account credentials.

Native Paperclip Runner exposes `publish_notebook_files` when the run has an assigned Notebook connection, an approved workspace, and standard work mode. Its connection selector lists eligible connection IDs. The agent supplies each file's workspace-relative source, destination path, byte size and SHA-256 from its approved file tools. The controller reads through the existing confined local reader or the server-bound remote workspace reader. It sends each Notebook action through the assigned gateway and returns the final publication operation. The tool does not return file bytes, upload tickets, or OAuth credentials. Dot additionally requires its existing workspace-access grant. Runtimes without a workspace grant do not receive this tool.

Agents running in an approved local shell with their existing Paperclip agent credential and active run header can also publish a file or built directory:

```sh
paperclipai notebook publish ./dist --connection CONNECTION_ID --title "Weekly report" --idempotency-key weekly-report-2026-10-20
```

The CLI obtains its ordinary instance credential from `PAPERCLIP_API_KEY` or the existing CLI credential options, and the active run from `PAPERCLIP_RUN_ID` or `--run-id`. It does not obtain Notebook OAuth credentials. Native provider shells do not automatically receive these credentials; use the native publishing tool there. The CLI reads only under the shell's existing filesystem permissions. It opens a bounded gateway session, checks the explicitly selected Notebook connection, and uses the normal action gateway for page creation, manifest preparation, and finalization. Upload requests contain only the object-specific ticket headers and use the existing public-only DNS-pinned transport, which rejects private/reserved addresses and redirects. The explicit local HTTP fixture option does not permit private HTTPS or LAN destinations. Completed or failed CLI operations revoke the temporary gateway session; an approval-pending session remains available until its bounded expiry so the approved action can execute.

Signed upload URLs travel only through the publisher's typed local-file transfer response. The Notebook transfer adapter removes complete ticket URLs from ordinary tool/model results, approval results, classifiers, and audit records before validation. After the usual current-run, selected-connection, assignment, and action checks, the private connector-transfer channel invokes the adapter to restore only matching structured upload URL fields for the guarded uploader. It cannot expose provider text, unrelated secret fields, or another action's result. Approved or lost responses recover fresh scoped tickets through the existing owner-authorized receipt path.

Published destination paths and entry files use the same canonical relative-path rules and 1024-byte UTF-8 ceiling in the CLI, native publisher, and private ticket transfer. Native workspace source paths retain the existing 1000-character reader limit. Invalid paths fail before page creation or upload preparation. Boundary fixtures prove client/API path-contract parity and ticket projection; they do not establish publication at the AWS object-key boundary.

Build client applications before publication. For an update, supply `--page-id` and `--expected-version`; the native tool accepts `pageId` and `expectedVersion`. Reuse a request key only for the same files and settings. When the gateway requests approval, stop and wait for the normal task approval result. Continue with the same request key after approval. A validating operation is not yet a successful publication; inspect it with `notebook_get_operation` before reporting a working share link.

After a lost response, failed upload, or approved action, retrying can return a shortened gateway audit summary. The publisher recovers the complete page or upload receipt with `notebook_get_operation` through the selected connection and its current action policy. Notebook requires write scope and ownership for receipt recovery. The original creation version and upload manifest remain pinned; recovery does not adopt a newer page version or repeat an approved mutation. Expired upload tickets require a new publication attempt.

Keep `notebook_get_operation` Allowed during recovery. If that status action is set to Ask first, its approved result can itself exceed the gateway's saved audit limit. Publication then stops with instructions to allow that recovery action and retry with the same key. It does not keep requesting approval or resend upload bytes. Other publishing actions can retain Ask first.

## Verification

The generic OAuth fixture runs against real PostgreSQL with an in-process Notebook protocol fixture. It verifies client registration, PKCE/resource binding, tool discovery, personal vault ownership, agent assignment, ordinary token refresh, reconnect policy preservation, and local removal. The suite supports a disposable external database through `PAPERCLIP_TEST_DATABASE_URL` when embedded PostgreSQL is unavailable. These fixtures do not establish a deployed Notebook endpoint or live hosted/self-hosted browser acceptance. Record that evidence against the actual deployment before release.

Removing the connection disables local use and clears its saved credentials through Paperclip's existing removal flow. It does not automatically revoke the remote Notebook authorization; users can revoke that grant from Notebook's Connected apps screen. Automatic remote cleanup, account-email labels, and custom keyed refresh recovery are deferred. If a rotating-token refresh response is lost, the standard OAuth flow may require reconnecting. Publication receipt recovery uses a separate operation protocol.

Native publication supports the same 25 MiB aggregate and 200-file limits for local and remote workspaces. The connector supplies this allowance to the shared workspace reader. The reader transfers remote files in bounded chunks, verifies the complete expected hash before publication, and preserves the operator's ordinary attachment limit (10 MiB by default). It does not increase Runner transport buffers or expose a model-controlled read allowance.

Remote publisher chunks fit the existing configured output capture, including base64 padding. Each file read permits at most 256 chunks and 120 seconds; each command retains its existing 10-second ceiling and the remaining overall deadline. A capture setting too small for that bounded transfer returns `paperclip_runner_file_handoff_capture_limit` before reading bytes or creating a page. Ordinary attachment reads keep their existing limits.

The local-transfer fixtures upload real 2 MiB bundles through a disposable HTTP gateway and upload origin. Native fixtures cover confined local bytes, a bound remote reader, selected connections, stopped-run authority, work modes, changed files, and gateway denial/approval propagation. Real Linux descriptor tests publish a 12 MiB remote asset and read the exact 25 MiB ceiling under a 4 MiB per-command output cap; ordinary attachment limits and mutation rejection remain enforced. These checks qualify the transfer path under controlled fixtures; they do not establish an actual deployed agent publication.

The real PostgreSQL-backed gateway tests also publish twenty local files after losing a committed creation response, failing an upload, and approving an Ask first upload. They exercise catalog-created connection keys, normalized MCP responses, truncated upload-plan replay, and complete receipt recovery while retaining Ask first and Off enforcement. Their synthetic AWS SigV4 tickets include session credentials and checksums; the exact signed bytes reach the uploader while ordinary HTTP/model responses, invocation snapshots, events, and logs remain ticket-free. Wrong-connection and non-upload private-transfer requests fail through the real HTTP route.

## Artwork provenance

Notebook uses the repository's first-party Paperclip mark from `ui/public/favicon.svg`. The fixed light and dark variants preserve its path and stroke widths while replacing the favicon's automatic theme stylesheet, as required by the shared connector icon renderer.

# Paperclip Notebook

Paperclip Notebook uses the standard remote HTTP MCP connection, authorization-code OAuth with PKCE, Dynamic Client Registration, and the existing instance credential vault. Hosted and self-hosted Paperclip use the same protocol. Cloud broker enrollment is unnecessary.

The Notebook service belongs to the Paperclip Cloud repository and authenticates users with Cloud. A Notebook OAuth grant authorizes resource operations; it is separate from the user's Cloud browser session.

## Deployment configuration

Notebook defaults to `https://notebook.paperclip.app/mcp` on hosted and self-hosted Paperclip. No per-instance registration or endpoint configuration is required for that service. Operators may override it with `PAPERCLIP_NOTEBOOK_MCP_URL` for staging or development. Invalid overrides make setup unavailable. Local development additionally accepts a loopback HTTP URL; the instance's remote-network policy still applies. The catalog describes connection support; it is not a live service health check. Deploy and verify the canonical service before release. Uploaded applications use the isolated `paperclipnotebook.com` content domain.

The endpoint must provide OAuth discovery, registration, code exchange, refresh, and `/oauth/revoke`. Its requesting client needs no pre-created secret. Discovery never expands the reviewed scope set:

- `notebook:read`
- `notebook:write`
- `notebook:share`
- `notebook:delete`

All four are requested by the standard connection. Sharing includes making a page public and visible in Explore. Assigned agents use the saved personal account; Notebook authorizes page management against that Cloud user's ownership. Paperclip retains its ordinary agent assignments and Allowed / Ask first / Off action policies.

`notebook_get_account` returns structured content containing `id`, `email`, and `emailVerified`. Setup uses this authenticated result for the account label and stable provider identity. It never trusts a browser callback's supplied email. Reconnect keeps the connection, assignments, and saved action restrictions.

## Publishing files

Ordinary MCP clients can publish small inline files with `notebook_publish`. Large files use `notebook_begin_upload`, narrowly scoped upload tickets, and `notebook_finalize_upload`. The remote server cannot read local filesystem paths. Upload tickets authorize only the declared quarantine objects; do not log them or treat them as account credentials.

Native Paperclip Runner exposes `publish_notebook_files` when the run has an assigned Notebook connection, an approved workspace, and standard work mode. Its connection selector lists eligible connection IDs. The agent supplies each file's workspace-relative source, destination path, byte size and SHA-256 from its approved file tools. The controller reads through the existing confined local reader or the server-bound remote workspace reader. It sends each Notebook action through the assigned gateway and returns the final publication operation. The tool does not return file bytes, upload tickets, or OAuth credentials. Dot additionally requires its existing workspace-access grant. Runtimes without a workspace grant do not receive this tool.

Agents running in an approved local shell with their existing Paperclip agent credential and active run header can also publish a file or built directory:

```sh
paperclipai notebook publish ./dist --connection CONNECTION_ID --title "Weekly report" --idempotency-key weekly-report-2026-10-20
```

The CLI obtains its ordinary instance credential from `PAPERCLIP_API_KEY` or the existing CLI credential options, and the active run from `PAPERCLIP_RUN_ID` or `--run-id`. It does not obtain Notebook OAuth credentials. Native provider shells do not automatically receive these credentials; use the native publishing tool there. The CLI reads only under the shell's existing filesystem permissions. It opens a bounded gateway session, checks the explicitly selected Notebook connection, and uses the normal action gateway for page creation, manifest preparation, and finalization. Upload requests contain only the object-specific ticket headers and use the existing public-only DNS-pinned transport, which rejects private/reserved addresses and redirects. The explicit local HTTP fixture option does not permit private HTTPS or LAN destinations. Completed or failed CLI operations revoke the temporary gateway session; an approval-pending session remains available until its bounded expiry so the approved action can execute.

Signed upload URLs travel only through the publisher's typed local-file transfer response. The gateway removes complete ticket URLs from ordinary tool/model results, approval results, classifiers, and audit records before validation. After the usual current-run, selected-connection, assignment, and action checks, the private transfer restores only matching structured upload URL fields for the guarded uploader. It cannot expose provider text, unrelated secret fields, or another action's result. Approved or lost responses recover fresh scoped tickets through the existing owner-authorized receipt path.

Build client applications before publication. For an update, supply `--page-id` and `--expected-version`; the native tool accepts `pageId` and `expectedVersion`. Reuse a request key only for the same files and settings. When the gateway requests approval, stop and wait for the normal task approval result. Continue with the same request key after approval. A validating operation is not yet a successful publication; inspect it with `notebook_get_operation` before reporting a working share link.

After a lost response, failed upload, or approved action, retrying can return a shortened gateway audit summary. The publisher recovers the complete page or upload receipt with `notebook_get_operation` through the selected connection and its current action policy. Notebook requires write scope and ownership for receipt recovery. The original creation version and upload manifest remain pinned; recovery does not adopt a newer page version or repeat an approved mutation. Expired upload tickets require a new publication attempt.

Keep `notebook_get_operation` Allowed during recovery. If that status action is set to Ask first, its approved result can itself exceed the gateway's saved audit limit. Publication then stops with instructions to allow that recovery action and retry with the same key. It does not keep requesting approval or resend upload bytes. Other publishing actions can retain Ask first.

## Verification

The generic OAuth fixture runs against real PostgreSQL with an in-process Notebook protocol fixture. It verifies client registration, PKCE/resource binding, account identity, tool discovery, personal vault ownership, agent assignment, reconnect policy preservation, rotating-token response-loss recovery, local removal, and failed upstream revocation followed by retry. The suite supports a disposable external database through `PAPERCLIP_TEST_DATABASE_URL` when embedded PostgreSQL is unavailable. These fixtures do not establish a deployed Notebook endpoint or live hosted/self-hosted browser acceptance. Record that evidence against the actual deployment before release.

Removal closes local access before calling Notebook. A failed remote revocation retains encrypted credentials only on the revoked grant, reports pending cleanup, and retries through server maintenance. Reconnect waits for that cleanup rather than replacing the credential needed to revoke the old authorization. Refresh calls send a stable idempotency key and retry one lost transport response with the same request.

Native publication supports the same 25 MiB aggregate and 200-file limits for local and remote workspaces. The server-owned Notebook reader transfers remote files in bounded chunks, verifies the complete expected hash before publication, and preserves the operator's ordinary attachment limit (10 MiB by default). It does not increase Runner transport buffers or expose a model-controlled read allowance.

The local-transfer fixtures upload real 2 MiB bundles through a disposable HTTP gateway and upload origin. Native fixtures cover confined local bytes, a bound remote reader, selected connections, stopped-run authority, work modes, changed files, and gateway denial/approval propagation. Real Linux descriptor tests publish a 12 MiB remote asset and read the exact 25 MiB ceiling under a 4 MiB per-command output cap; ordinary attachment limits and mutation rejection remain enforced. These checks qualify the transfer path under controlled fixtures; they do not establish an actual deployed agent publication.

The real PostgreSQL-backed gateway tests also publish twenty local files after losing a committed creation response, failing an upload, and approving an Ask first upload. They exercise catalog-created connection keys, normalized MCP responses, truncated upload-plan replay, and complete receipt recovery while retaining Ask first and Off enforcement. Their synthetic AWS SigV4 tickets include session credentials and checksums; the exact signed bytes reach the uploader while ordinary HTTP/model responses, invocation snapshots, events, and logs remain ticket-free. Wrong-connection and non-upload private-transfer requests fail through the real HTTP route.

## Artwork provenance

Notebook uses the repository's first-party Paperclip mark from `ui/public/favicon.svg`. The fixed light and dark variants preserve its path and stroke widths while replacing the favicon's automatic theme stylesheet, as required by the shared connector icon renderer.

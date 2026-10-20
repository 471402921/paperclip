# Paperclip Notebook

Paperclip Notebook uses the standard remote HTTP MCP connection, authorization-code OAuth with PKCE, Dynamic Client Registration, and the existing instance credential vault. Hosted and self-hosted Paperclip use the same protocol. Cloud broker enrollment is unnecessary.

The Notebook service belongs to the Paperclip Cloud repository and authenticates users with Cloud. A Notebook OAuth grant authorizes resource operations; it is separate from the user's Cloud browser session.

## Deployment configuration

Set `PAPERCLIP_NOTEBOOK_MCP_URL` to the deployed Notebook HTTPS `/mcp` endpoint on the Paperclip server. The app stays unavailable until this is configured. No production hostname is assumed. Local development additionally accepts a loopback HTTP URL; the instance's remote-network policy still applies.

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

The CLI obtains its ordinary instance credential from `PAPERCLIP_API_KEY` or the existing CLI credential options, and the active run from `PAPERCLIP_RUN_ID` or `--run-id`. It does not obtain Notebook OAuth credentials. Native provider shells do not automatically receive these credentials; use the native publishing tool there. The CLI reads only under the shell's existing filesystem permissions. It opens a bounded gateway session, checks the explicitly selected Notebook connection, and uses the normal action gateway for page creation, manifest preparation, and finalization. Upload requests contain only the object-specific ticket headers. Completed or failed CLI operations revoke the temporary gateway session; an approval-pending session remains available until its bounded expiry so the approved action can execute.

Build client applications before publication. For an update, supply `--page-id` and `--expected-version`; the native tool accepts `pageId` and `expectedVersion`. Reuse a request key only for the same files and settings. When the gateway requests approval, stop and wait for the normal task approval result. Continue with the same request key after approval. A validating operation is not yet a successful publication; inspect it with `notebook_get_operation` before reporting a working share link.

## Verification

The generic OAuth fixture runs against real PostgreSQL with an in-process Notebook protocol fixture. It verifies client registration, PKCE/resource binding, account identity, tool discovery, personal vault ownership, agent assignment, reconnect policy preservation, rotating-token response-loss recovery, local removal, and failed upstream revocation followed by retry. The suite supports a disposable external database through `PAPERCLIP_TEST_DATABASE_URL` when embedded PostgreSQL is unavailable. These fixtures do not establish a deployed Notebook endpoint or live hosted/self-hosted browser acceptance. Record that evidence against the actual deployment before release.

Removal closes local access before calling Notebook. A failed remote revocation retains encrypted credentials only on the revoked grant, reports pending cleanup, and retries through server maintenance. Reconnect waits for that cleanup rather than replacing the credential needed to revoke the old authorization. Refresh calls send a stable idempotency key and retry one lost transport response with the same request.

The local-transfer fixtures upload real 2 MiB bundles through a disposable HTTP gateway and upload origin. Native fixtures cover confined local bytes, a bound remote reader, selected connections, stopped-run authority, work modes, changed files, and gateway denial/approval propagation. These checks qualify the transfer path under controlled fixtures; they do not establish an actual deployed agent publication.

## Artwork provenance

Notebook uses the repository's first-party Paperclip mark from `ui/public/favicon.svg`. The fixed light and dark variants preserve its path and stroke widths while replacing the favicon's automatic theme stylesheet, as required by the shared connector icon renderer.

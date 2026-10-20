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

Ordinary MCP clients can publish small inline files with `notebook_publish`. Large files use `notebook_begin_upload`, narrowly scoped upload tickets, and `notebook_finalize_upload`. The remote server cannot read local filesystem paths. The Notebook client helper must use the runtime's approved file access and the selected connection rather than project the OAuth token into an agent's environment. Agents with approved terminal/HTTP access can upload local files with the returned object tickets and then call finalization through the same MCP connection. Upload tickets authorize only the declared quarantine objects; they must not be treated as general account credentials.

## Verification

The generic OAuth fixture runs against real PostgreSQL with an in-process Notebook protocol fixture. It verifies client registration, PKCE/resource binding, account identity, tool discovery, personal vault ownership, agent assignment, reconnect policy preservation, rotating-token response-loss recovery, local removal, and failed upstream revocation followed by retry. The suite supports a disposable external database through `PAPERCLIP_TEST_DATABASE_URL` when embedded PostgreSQL is unavailable. These fixtures do not establish a deployed Notebook endpoint or live hosted/self-hosted browser acceptance. Record that evidence against the actual deployment before release.

Removal closes local access before calling Notebook. A failed remote revocation retains encrypted credentials only on the revoked grant, reports pending cleanup, and retries through server maintenance. Reconnect waits for that cleanup rather than replacing the credential needed to revoke the old authorization. Refresh calls send a stable idempotency key and retry one lost transport response with the same request.

## Artwork provenance

Notebook uses the repository's first-party Paperclip mark from `ui/public/favicon.svg`. The fixed light and dark variants preserve its path and stroke widths while replacing the favicon's automatic theme stylesheet, as required by the shared connector icon renderer.

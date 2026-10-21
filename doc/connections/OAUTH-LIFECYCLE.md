# Remote OAuth lifecycle

Remote MCP connections continue to use OAuth discovery, dynamic client registration, PKCE, resource-bound tokens, and the encrypted credential vault. The lifecycle additions cover provider account metadata, explicitly supported refresh recovery, and remote authorization revocation.

## Provider contributions

The bundled lifecycle registry is empty. A connector may contribute configuration, an authenticated account lookup, or keyed refresh recovery through a compiled adapter. Connection configuration and remote tool output cannot register an adapter or enable a capability. Saved application identity selects the adapter; mutable display metadata does not.

An account adapter returns the connected account name, stable provider ID, and connection label after token exchange. Providers that support idempotent refresh receipts may opt into the keyed retry contract. The client repeats a failed transport or response-body read once with the same key. Parsed OAuth errors are not retried. Other providers retain their existing refresh behavior.

## Revocation and removal

Vault-backed OAuth providers can advertise a revocation endpoint and its supported client authentication through their authorization-server metadata. Discovery binds that metadata to the saved issuer and authorization/token endpoints. No endpoint is guessed. Providers without a revocation endpoint retain local-only removal. Managed Cloud broker connections retain their existing provider-specific lifecycle.

Removing a connection closes local agent and human access first. Remote revocation then uses the retained encrypted credential. If the provider is unavailable, removal reports that remote revocation is pending, preserves only the credentials needed for cleanup, and blocks reconnect until cleanup finishes. Provider resources are not deleted by OAuth revocation.

The existing server scheduler retries at most two pending connections per sweep, at most once per minute, and honors idle-drain and shutdown controls. Initial removal and scheduled retries share the same cleanup claim. They use the current locked connection and revoked grants through remote cleanup, so an older request cannot remove a newly reconnected account. Successful cleanup deletes owned credentials while retaining secrets referenced by other active grants.

Personal and shared callbacks check the locked connection and grant before saving credentials. They cannot restore an authorization revoked after sign-in began. A new sign-in after completed revocation remains permitted. Promotion of a personal identity to an active company identity is recorded separately from revocation, allowing a legitimate concurrent reconnect. Explicit grant revocation, membership removal or suspension, and connection removal clear that promotion exception. Promotion also verifies its locked source identity before committing copied credentials.

## Revocation history and upgrades

Private database watermarks record true grant revocation and full connection removal using the database clock. Reauthorization does not clear them. Both callback paths check them under the existing locks, so an older callback cannot replace a newer authorization or restore a removed connection before a replacement grant exists. Intentional personal-to-company promotion does not advance the true-revocation watermark.

The migration backfills existing revocation history and clears pending OAuth sign-in states once. Pending browser sign-ins must restart after upgrade. Existing active grants and access or refresh credentials remain intact. The watermarks are not accepted from callers or returned by connection, grant, or support inspection APIs.

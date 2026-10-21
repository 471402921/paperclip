ALTER TABLE "connection_grants" ADD COLUMN IF NOT EXISTS "authorization_revoked_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "tool_connections" ADD COLUMN IF NOT EXISTS "authorization_revoked_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "connection_grants"
SET "authorization_revoked_at" = "revoked_at"
WHERE "authorization_revoked_at" IS NULL
  AND "revoked_at" IS NOT NULL
  AND "provider_tenant" #>> '{oauth,supersededByGrantId}' IS NULL;
--> statement-breakpoint
UPDATE "tool_connections"
SET "authorization_revoked_at" = "updated_at"
WHERE "authorization_revoked_at" IS NULL AND "status" = 'archived';
--> statement-breakpoint
DELETE FROM "tool_oauth_states";

CREATE TABLE "plugin_secrets" (
	"company_id" uuid NOT NULL,
	"plugin_id" uuid NOT NULL,
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"material" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_secrets_company_id_plugin_id_key_pk" PRIMARY KEY("company_id","plugin_id","key")
);
--> statement-breakpoint
ALTER TABLE "plugin_secrets" ADD CONSTRAINT "plugin_secrets_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "plugin_secrets" ADD CONSTRAINT "plugin_secrets_plugin_id_plugins_id_fk" FOREIGN KEY ("plugin_id") REFERENCES "public"."plugins"("id") ON DELETE cascade ON UPDATE no action;
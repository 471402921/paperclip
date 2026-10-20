import {
  pgTable,
  uuid,
  text,
  integer,
  jsonb,
  timestamp,
  primaryKey,
} from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { plugins } from "./plugins.js";

// Private worker credentials never enter company secret catalogs or plugin state.
export const pluginSecrets = pgTable(
  "plugin_secrets",
  {
    companyId: uuid("company_id")
      .notNull()
      .references(() => companies.id, { onDelete: "cascade" }),
    pluginId: uuid("plugin_id")
      .notNull()
      .references(() => plugins.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    version: integer("version").notNull(),
    material: jsonb("material").$type<Record<string, unknown>>(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.companyId, table.pluginId, table.key] }),
  }),
);

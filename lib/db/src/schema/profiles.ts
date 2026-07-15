import { pgTable, serial, text, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const profilesTable = pgTable("profiles", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category").notNull().default("custom"),
  targets: jsonb("targets").notNull().default([]),
  diagnostics: jsonb("diagnostics").notNull().default([]),
  config: jsonb("config").default({}),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  isPreset: boolean("is_preset").notNull().default(false),
});

export const insertProfileSchema = createInsertSchema(profilesTable).omit({ id: true });
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type ProfileRow = typeof profilesTable.$inferSelect;

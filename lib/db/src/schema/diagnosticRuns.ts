import { pgTable, serial, text, integer, real, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const diagnosticRunsTable = pgTable("diagnostic_runs", {
  id: serial("id").primaryKey(),
  type: text("type").notNull(),
  target: text("target").notNull(),
  status: text("status").notNull().default("running"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  durationMs: integer("duration_ms"),
  demoMode: boolean("demo_mode").notNull().default(false),
  rawOutput: text("raw_output"),
  parsedResult: jsonb("parsed_result"),
  metrics: jsonb("metrics"),
  hops: jsonb("hops"),
  dnsRecords: jsonb("dns_records"),
  error: text("error"),
  parseWarnings: jsonb("parse_warnings").default([]),
  config: jsonb("config"),
});

export const insertDiagnosticRunSchema = createInsertSchema(diagnosticRunsTable).omit({ id: true });
export type InsertDiagnosticRun = z.infer<typeof insertDiagnosticRunSchema>;
export type DiagnosticRunRow = typeof diagnosticRunsTable.$inferSelect;

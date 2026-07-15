import { Router } from "express";
import { db } from "@workspace/db";
import { diagnosticRunsTable } from "@workspace/db";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";
import { formatRun } from "./diagnostics.js";
import {
  runPing, runTraceroute, runDns, runPortCheck, runGatewayCheck,
} from "../lib/commands/adapter.js";

const router = Router();

// GET /api/diagnostics/history
router.get("/diagnostics/history", async (req, res): Promise<void> => {
  const { type, target, status, from, to, limit = "50", offset = "0" } = req.query as Record<string, string>;

  const conditions = [];
  if (type) conditions.push(eq(diagnosticRunsTable.type, type));
  if (status) conditions.push(eq(diagnosticRunsTable.status, status));
  if (from) conditions.push(gte(diagnosticRunsTable.startedAt, new Date(from)));
  if (to) conditions.push(lte(diagnosticRunsTable.startedAt, new Date(to)));
  if (target) {
    const safe = target.replace(/[%_]/g, "\\$&");
    conditions.push(sql`${diagnosticRunsTable.target} ilike ${"%" + safe + "%"}`);
  }

  const limitN = Math.min(parseInt(limit) || 50, 200);
  const offsetN = parseInt(offset) || 0;

  const [runs, countResult] = await Promise.all([
    db.select().from(diagnosticRunsTable)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(diagnosticRunsTable.startedAt))
      .limit(limitN)
      .offset(offsetN),
    db.select({ count: sql<number>`count(*)` }).from(diagnosticRunsTable)
      .where(conditions.length ? and(...conditions) : undefined),
  ]);

  res.json({
    runs: runs.map(formatRun),
    total: Number(countResult[0]?.count ?? 0),
    limit: limitN,
    offset: offsetN,
  });
});

// GET /api/diagnostics/run/:id
router.get("/diagnostics/run/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [run] = await db.select().from(diagnosticRunsTable).where(eq(diagnosticRunsTable.id, id));
  if (!run) {
    res.status(404).json({ error: "Run not found" });
    return;
  }
  res.json(formatRun(run));
});

// POST /api/diagnostics/run/:id/rerun
router.post("/diagnostics/run/:id/rerun", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }

  const [original] = await db.select().from(diagnosticRunsTable).where(eq(diagnosticRunsTable.id, id));
  if (!original) {
    res.status(404).json({ error: "Run not found" });
    return;
  }

  const config = (original.config ?? {}) as Record<string, unknown>;
  const target = original.target;
  const startedAt = new Date();

  try {
    let resultRun: typeof diagnosticRunsTable.$inferSelect | null = null;

    if (original.type === "ping") {
      const r = await runPing(target, (config.count as number) ?? 4, (config.timeout as number) ?? 10);
      const completedAt = new Date();
      const [row] = await db.insert(diagnosticRunsTable).values({
        type: "ping", target, status: r.parsed.success ? "success" : "failure",
        startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
        demoMode: r.demoMode, rawOutput: r.raw,
        parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
        metrics: r.parsed.metrics as unknown as Record<string, unknown>,
        hops: null, dnsRecords: null,
        error: r.parsed.success ? null : "Unreachable",
        parseWarnings: r.parsed.warnings, config,
      }).returning();
      resultRun = row;
    } else if (original.type === "traceroute") {
      const r = await runTraceroute(target, (config.maxHops as number) ?? 20, (config.timeout as number) ?? 30);
      const completedAt = new Date();
      const [row] = await db.insert(diagnosticRunsTable).values({
        type: "traceroute", target, status: r.parsed.success ? "success" : "failure",
        startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
        demoMode: r.demoMode, rawOutput: r.raw,
        parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
        metrics: { hopCount: r.parsed.hopCount } as Record<string, unknown>,
        hops: r.parsed.hops as unknown[], dnsRecords: null,
        error: r.parsed.success ? null : "Failed",
        parseWarnings: r.parsed.warnings,
      }).returning();
      resultRun = row;
    } else if (original.type === "dns") {
      const recordType = ((config.recordType as string) ?? "A") as "A";
      const r = await runDns(target, recordType);
      const completedAt = new Date();
      const [row] = await db.insert(diagnosticRunsTable).values({
        type: "dns", target, status: r.parsed.success ? "success" : "failure",
        startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
        demoMode: r.demoMode, rawOutput: r.raw,
        parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
        metrics: null, hops: null,
        dnsRecords: r.parsed.records as unknown[],
        error: r.parsed.success ? null : "Failed",
        parseWarnings: r.parsed.warnings,
      }).returning();
      resultRun = row;
    } else if (original.type === "gateway") {
      const r = await runGatewayCheck();
      const completedAt = new Date();
      const [row] = await db.insert(diagnosticRunsTable).values({
        type: "gateway", target: r.gateway ?? "unknown",
        status: r.reachable ? "success" : "failure",
        startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
        demoMode: r.demoMode, rawOutput: r.raw,
        parsedResult: { summary: r.reachable ? "Gateway reachable" : "Gateway unreachable", success: r.reachable, details: {} },
        metrics: { latencyAvg: r.latencyMs } as Record<string, unknown>,
        hops: null, dnsRecords: null,
        error: r.reachable ? null : "Unreachable",
        parseWarnings: [],
      }).returning();
      resultRun = row;
    } else if (original.type === "port-check") {
      const portStr = target.split(":").pop();
      const port = portStr ? parseInt(portStr) : 80;
      const host = target.includes(":") ? target.split(":").slice(0, -1).join(":") : target;
      const r = await runPortCheck(host, port, (config.timeout as number) ?? 5);
      const completedAt = new Date();
      const [row] = await db.insert(diagnosticRunsTable).values({
        type: "port-check", target,
        status: r.open ? "success" : "failure",
        startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
        demoMode: r.demoMode, rawOutput: r.raw,
        parsedResult: { summary: `Port ${port} is ${r.open ? "OPEN" : "CLOSED"}`, success: r.open, details: { port, open: r.open } },
        metrics: { latencyAvg: r.latencyMs } as Record<string, unknown>,
        hops: null, dnsRecords: null,
        error: r.open ? null : "Port closed",
        parseWarnings: [],
      }).returning();
      resultRun = row;
    }

    if (!resultRun) {
      res.status(400).json({ error: "Unsupported diagnostic type" });
      return;
    }
    res.json(formatRun(resultRun));
  } catch (err: unknown) {
    const [row] = await db.insert(diagnosticRunsTable).values({
      type: original.type, target, status: "failure", startedAt, demoMode: false,
      error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [],
    }).returning();
    res.json(formatRun(row));
  }
});

export default router;

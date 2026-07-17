import { Router } from "express";
import { getDb, diagnosticRunsTable } from "@workspace/db";
import { eq, desc, gte, lte, and, sql } from "drizzle-orm";

const router = Router();

// GET /api/diagnostics/history
router.get("/diagnostics/history", async (req, res): Promise<void> => {
  const db = getDb();
  const { type, target, status, from, to, limit = "50", offset = "0" } = req.query as Record<string, string>;
  const whereClauses: any[] = [];

  if (type) whereClauses.push(eq(diagnosticRunsTable.type, type as string));
  if (target) whereClauses.push(sql`${diagnosticRunsTable.target} ILIKE ${`%${target}%`}`);
  if (status) whereClauses.push(eq(diagnosticRunsTable.status, status as string));
  if (from) whereClauses.push(gte(diagnosticRunsTable.startedAt, new Date(from)));
  if (to) whereClauses.push(lte(diagnosticRunsTable.startedAt, new Date(to)));

  const query = db.select().from(diagnosticRunsTable);
  if (whereClauses.length > 0) {
    query.where(and(...whereClauses));
  }

  const runs = await query
    .orderBy(desc(diagnosticRunsTable.startedAt))
    .limit(Number(limit))
    .offset(Number(offset));

  res.json({ runs: runs.map(r => ({
    id: r.id,
    type: r.type,
    target: r.target,
    status: r.status,
    startedAt: r.startedAt?.toISOString(),
    completedAt: r.completedAt?.toISOString() ?? null,
    durationMs: r.durationMs,
    demoMode: r.demoMode,
    error: r.error,
  }))});
});

// GET /api/diagnostics/run/:id
router.get("/diagnostics/run/:id", async (req, res): Promise<void> => {
  const db = getDb();
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
  res.json(run);
});

// POST /api/diagnostics/run/:id/rerun
router.post("/diagnostics/run/:id/rerun", async (req, res): Promise<void> => {
  const db = getDb();
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [original] = await db.select().from(diagnosticRunsTable).where(eq(diagnosticRunsTable.id, id));
  if (!original) {
    res.status(404).json({ error: "Original run not found" });
    return;
  }

  const startedAt = new Date();
  try {
    let result: any;
    if (original.type === "ping") {
      const { runPing } = await import("../lib/commands/adapter.js");
      result = await runPing(original.target, 4, 5);
    } else if (original.type === "traceroute") {
      const { runTraceroute } = await import("../lib/commands/adapter.js");
      result = await runTraceroute(original.target, 20, 30);
    } else if (original.type === "dns") {
      const { runDns } = await import("../lib/commands/adapter.js");
      result = await runDns(original.target, "A", null);
    } else if (original.type === "port-check") {
      const { runPortCheck } = await import("../lib/commands/adapter.js");
      const portMatch = original.target.match(/:(\d+)$/);
      const port = portMatch ? parseInt(portMatch[1]) : 80;
      result = await runPortCheck(original.target.replace(/:\d+$/, ""), port, 5);
    } else {
      res.status(400).json({ error: "Rerun not supported for this type" });
      return;
    }

    const completedAt = new Date();
    const [run] = await db.insert(diagnosticRunsTable).values({
      type: original.type,
      target: original.target,
      status: result.parsed.success ? "success" : "failure",
      startedAt,
      completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode,
      rawOutput: result.raw,
      parsedResult: { summary: result.parsed.summary, success: result.parsed.success, details: {} },
      metrics: result.parsed.metrics,
      hops: result.parsed.hops ?? null,
      dnsRecords: result.parsed.records ?? null,
      error: result.parsed.success ? null : "Rerun failed",
      parseWarnings: result.parsed.warnings,
    }).returning();
    res.json(run);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Rerun failed" });
  }
});

export default router;
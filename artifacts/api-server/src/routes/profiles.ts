import { Router } from "express";
import { getDb, isDatabaseAvailable, profilesTable, diagnosticRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
  runPing, runTraceroute, runDns, runPortCheck,
} from "../lib/commands/adapter.js";

const router = Router();

const ProfileInputSchema = z.object({
  name: z.string().min(1),
  description: z.string().nullish(),
  category: z.string().optional().default("custom"),
  targets: z.array(z.string()).min(1),
  diagnostics: z.array(z.string()).min(1),
  config: z.record(z.unknown()).optional().default({}),
});

function formatProfile(p: typeof profilesTable.$inferSelect) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    targets: p.targets as string[],
    diagnostics: p.diagnostics as string[],
    config: p.config ?? {},
    lastRunAt: p.lastRunAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    isPreset: p.isPreset,
  };
}

async function requireDb(req: any, res: any): Promise<ReturnType<typeof getDb> | null> {
  if (!isDatabaseAvailable()) {
    res.status(503).json({ error: "Database is not configured. Set DATABASE_URL to enable persistence." });
    return null;
  }
  return getDb();
}

// GET /api/profiles
router.get("/profiles", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const profiles = await db.select().from(profilesTable).orderBy(profilesTable.isPreset, profilesTable.id);
  res.json(profiles.map(formatProfile));
});

// GET /api/profiles/:id
router.get("/profiles/:id", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [p] = await db.select().from(profilesTable).where(eq(profilesTable.id, id));
  if (!p) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(formatProfile(p));
});

// POST /api/profiles
router.post("/profiles", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const parsed = ProfileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const [p] = await db.insert(profilesTable).values({
    name: parsed.data.name,
    description: parsed.data.description ?? null,
    category: parsed.data.category,
    targets: parsed.data.targets,
    diagnostics: parsed.data.diagnostics,
    config: parsed.data.config,
    isPreset: false,
  }).returning();
  res.status(201).json(formatProfile(p));
});

// PUT /api/profiles/:id
router.put("/profiles/:id", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const parsed = ProfileInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" });
    return;
  }
  const [p] = await db.update(profilesTable)
    .set({
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      targets: parsed.data.targets,
      diagnostics: parsed.data.diagnostics,
      config: parsed.data.config,
    })
    .where(eq(profilesTable.id, id))
    .returning();
  if (!p) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }
  res.json(formatProfile(p));
});

// DELETE /api/profiles/:id
router.delete("/profiles/:id", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  await db.delete(profilesTable).where(eq(profilesTable.id, id));
  res.status(204).end();
});

// POST /api/profiles/:id/run
router.post("/profiles/:id/run", async (req, res): Promise<void> => {
  const db = await requireDb(req, res);
  if (!db) return;
  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid ID" });
    return;
  }
  const [profile] = await db.select().from(profilesTable).where(eq(profilesTable.id, id));
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const targets = profile.targets as string[];
  const diagnostics = profile.diagnostics as string[];
  const config = (profile.config ?? {}) as Record<string, unknown>;

  const results: object[] = [];
  for (const target of targets) {
    for (const diag of diagnostics) {
      const startedAt = new Date();
      try {
        if (diag === "ping") {
          const r = await runPing(target, (config.count as number) ?? 4);
          const completedAt = new Date();
          const [run] = await db.insert(diagnosticRunsTable).values({
            type: "ping", target, status: r.parsed.success ? "success" : "failure",
            startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
            demoMode: r.demoMode, rawOutput: r.raw,
            parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
            metrics: r.parsed.metrics as unknown as Record<string, unknown>,
            hops: null, dnsRecords: null,
            error: r.parsed.success ? null : "Unreachable",
            parseWarnings: r.parsed.warnings, config,
          }).returning();
          results.push(run);
        } else if (diag === "traceroute") {
          const r = await runTraceroute(target);
          const completedAt = new Date();
          const [run] = await db.insert(diagnosticRunsTable).values({
            type: "traceroute", target, status: r.parsed.success ? "success" : "failure",
            startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
            demoMode: r.demoMode, rawOutput: r.raw,
            parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
            metrics: { hopCount: r.parsed.hopCount } as Record<string, unknown>,
            hops: r.parsed.hops as unknown[], dnsRecords: null,
            error: r.parsed.success ? null : "Failed",
            parseWarnings: r.parsed.warnings,
          }).returning();
          results.push(run);
        } else if (diag === "dns") {
          const r = await runDns(target);
          const completedAt = new Date();
          const [run] = await db.insert(diagnosticRunsTable).values({
            type: "dns", target, status: r.parsed.success ? "success" : "failure",
            startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
            demoMode: r.demoMode, rawOutput: r.raw,
            parsedResult: { summary: r.parsed.summary, success: r.parsed.success, details: {} },
            metrics: null, hops: null,
            dnsRecords: r.parsed.records as unknown[],
            error: r.parsed.success ? null : "Failed",
            parseWarnings: r.parsed.warnings,
          }).returning();
          results.push(run);
        } else if (diag === "port-check") {
          const port = (config.port as number) ?? 80;
          const r = await runPortCheck(target, port);
          const completedAt = new Date();
          const [run] = await db.insert(diagnosticRunsTable).values({
            type: "port-check", target: `${target}:${port}`, status: r.open ? "success" : "failure",
            startedAt, completedAt, durationMs: completedAt.getTime() - startedAt.getTime(),
            demoMode: r.demoMode, rawOutput: r.raw,
            parsedResult: { summary: `Port ${port} is ${r.open ? "OPEN" : "CLOSED"}`, success: r.open, details: { port, open: r.open } },
            metrics: { latencyAvg: r.latencyMs } as Record<string, unknown>,
            hops: null, dnsRecords: null,
            error: r.open ? null : "Port closed",
            parseWarnings: [],
          }).returning();
          results.push(run);
        }
      } catch (err: unknown) {
        const [run] = await db.insert(diagnosticRunsTable).values({
          type: diag, target, status: "failure", startedAt, demoMode: false,
          error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [],
        }).returning();
        results.push(run);
      }
    }
  }

  await db.update(profilesTable).set({ lastRunAt: new Date() }).where(eq(profilesTable.id, id));
  res.json(results);
});

export default router;

import { Router } from "express";
import { diagnosticRunsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import {
  runPing, runTraceroute, runDns, runPortCheck, runGatewayCheck,
  getNetworkInterfaces, runHttpTest, runSslCheck, runWhois, getArpTable,
} from "../lib/commands/adapter.js";
import {
  PingInputSchema, TracerouteInputSchema, DnsInputSchema, PortCheckInputSchema,
} from "../lib/commands/allowlist.js";
import { z } from "zod";
import { getDb } from "@workspace/db";

const router = Router();

async function getDB() {
  return getDb();
}

async function saveRun(data: {
  type: string;
  target: string;
  status: string;
  startedAt: Date;
  completedAt?: Date;
  durationMs?: number;
  demoMode: boolean;
  rawOutput?: string | null;
  parsedResult?: Record<string, unknown> | null;
  metrics?: Record<string, unknown> | null;
  hops?: unknown[] | null;
  dnsRecords?: unknown[] | null;
  error?: string | null;
  parseWarnings?: string[];
  config?: Record<string, unknown> | null;
}) {
  const db = await getDB();
  const [run] = await db
    .insert(diagnosticRunsTable)
    .values(data as typeof diagnosticRunsTable.$inferInsert)
    .returning();
  return run;
}

// ─── PING ─────────────────────────────────────────────────────────────────────
router.post("/diagnostics/ping", async (req, res): Promise<void> => {
  const parsed = PingInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  const { target, count, timeout } = parsed.data;
  const startedAt = new Date();
  try {
    const result = await runPing(target, count, timeout);
    const completedAt = new Date();
    const run = await saveRun({
      type: "ping", target,
      status: result.parsed.success ? "success" : "failure",
      startedAt, completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode,
      rawOutput: result.raw,
      parsedResult: { summary: result.parsed.summary, success: result.parsed.success, details: {} },
      metrics: result.parsed.metrics as unknown as Record<string, unknown>,
      hops: null, dnsRecords: null,
      error: result.parsed.success ? null : "Host unreachable or packet loss",
      parseWarnings: result.parsed.warnings,
      config: { count, timeout },
    });
    res.json(formatRun(run));
  } catch (err: unknown) {
    const run = await saveRun({ type: "ping", target, status: "failure", startedAt, demoMode: false, error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [] });
    res.json(formatRun(run));
  }
});

// ─── TRACEROUTE ───────────────────────────────────────────────────────────────
router.post("/diagnostics/traceroute", async (req, res): Promise<void> => {
  const parsed = TracerouteInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  const { target, maxHops, timeout } = parsed.data;
  const startedAt = new Date();
  try {
    const result = await runTraceroute(target, maxHops, timeout);
    const completedAt = new Date();
    const avgRtt = result.parsed.hops.filter(h => h.rtt1 !== null).reduce((s, h) => s + (h.rtt1 ?? 0), 0)
      / Math.max(1, result.parsed.hops.filter(h => h.rtt1 !== null).length);
    const run = await saveRun({
      type: "traceroute", target,
      status: result.parsed.success ? "success" : "failure",
      startedAt, completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode, rawOutput: result.raw,
      parsedResult: { summary: result.parsed.summary, success: result.parsed.success, details: {} },
      metrics: { hopCount: result.parsed.hopCount, latencyAvg: avgRtt || null },
      hops: result.parsed.hops as unknown[],
      dnsRecords: null,
      error: result.parsed.success ? null : "Traceroute failed",
      parseWarnings: result.parsed.warnings,
      config: { maxHops, timeout },
    });
    res.json(formatRun(run));
  } catch (err: unknown) {
    const run = await saveRun({ type: "traceroute", target, status: "failure", startedAt, demoMode: false, error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [] });
    res.json(formatRun(run));
  }
});

// ─── DNS ──────────────────────────────────────────────────────────────────────
router.post("/diagnostics/dns", async (req, res): Promise<void> => {
  const parsed = DnsInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  const { target, recordType, server } = parsed.data;
  const startedAt = new Date();
  try {
    const result = await runDns(target, recordType, server);
    const completedAt = new Date();
    const run = await saveRun({
      type: "dns", target,
      status: result.parsed.success ? "success" : "failure",
      startedAt, completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode, rawOutput: result.raw,
      parsedResult: { summary: result.parsed.summary, success: result.parsed.success, details: {} },
      metrics: null, hops: null,
      dnsRecords: result.parsed.records as unknown[],
      error: result.parsed.success ? null : "DNS resolution failed",
      parseWarnings: result.parsed.warnings,
      config: { recordType, server: server ?? null },
    });
    res.json(formatRun(run));
  } catch (err: unknown) {
    const run = await saveRun({ type: "dns", target, status: "failure", startedAt, demoMode: false, error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [] });
    res.json(formatRun(run));
  }
});

// ─── PORT CHECK ───────────────────────────────────────────────────────────────
router.post("/diagnostics/port-check", async (req, res): Promise<void> => {
  const parsed = PortCheckInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  const { target, port, timeout } = parsed.data;
  const startedAt = new Date();
  try {
    const result = await runPortCheck(target, port, timeout);
    const completedAt = new Date();
    const run = await saveRun({
      type: "port-check", target: `${target}:${port}`,
      status: result.open ? "success" : "failure",
      startedAt, completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode, rawOutput: result.raw,
      parsedResult: { summary: `Port ${port} is ${result.open ? "OPEN" : "CLOSED"}`, success: result.open, details: { port, open: result.open } },
      metrics: { latencyAvg: result.latencyMs },
      hops: null, dnsRecords: null,
      error: result.open ? null : `Port ${port} is closed or filtered`,
      parseWarnings: [],
      config: { port, timeout },
    });
    res.json(formatRun(run));
  } catch (err: unknown) {
    const run = await saveRun({ type: "port-check", target: `${target}:${port}`, status: "failure", startedAt, demoMode: false, error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [] });
    res.json(formatRun(run));
  }
});

// ─── GATEWAY ──────────────────────────────────────────────────────────────────
router.get("/diagnostics/gateway", async (req, res): Promise<void> => {
  const startedAt = new Date();
  try {
    const result = await runGatewayCheck();
    const completedAt = new Date();
    const run = await saveRun({
      type: "gateway", target: result.gateway ?? "unknown",
      status: result.reachable ? "success" : "failure",
      startedAt, completedAt,
      durationMs: completedAt.getTime() - startedAt.getTime(),
      demoMode: result.demoMode, rawOutput: result.raw,
      parsedResult: { summary: result.reachable ? `Gateway ${result.gateway} is reachable` : "Gateway unreachable", success: result.reachable, details: { gateway: result.gateway } },
      metrics: { latencyAvg: result.latencyMs },
      hops: null, dnsRecords: null,
      error: result.reachable ? null : "Gateway unreachable",
      parseWarnings: [],
    });
    res.json(formatRun(run));
  } catch (err: unknown) {
    const run = await saveRun({ type: "gateway", target: "default", status: "failure", startedAt, demoMode: false, error: err instanceof Error ? err.message : "Unknown error", parseWarnings: [] });
    res.json(formatRun(run));
  }
});

// ─── HTTP TESTER ──────────────────────────────────────────────────────────────
const HttpInputSchema = z.object({
  url: z.string().min(1),
  method: z.enum(["HEAD", "GET", "POST", "PUT", "DELETE", "OPTIONS"]).optional().default("HEAD"),
});

router.post("/diagnostics/http", async (req, res): Promise<void> => {
  const parsed = HttpInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  try {
    const result = await runHttpTest(parsed.data.url, parsed.data.method);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "HTTP test failed" });
  }
});

// ─── SSL CHECKER ──────────────────────────────────────────────────────────────
const SslInputSchema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).optional().default(443),
});

router.post("/diagnostics/ssl", async (req, res): Promise<void> => {
  const parsed = SslInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  try {
    const result = await runSslCheck(parsed.data.host, parsed.data.port);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "SSL check failed" });
  }
});

// ─── WHOIS ────────────────────────────────────────────────────────────────────
const WhoisInputSchema = z.object({
  domain: z.string().min(1).max(253),
});

router.post("/diagnostics/whois", async (req, res): Promise<void> => {
  const parsed = WhoisInputSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }); return; }
  try {
    const result = await runWhois(parsed.data.domain);
    res.json(result);
  } catch (err: unknown) {
    res.status(400).json({ error: err instanceof Error ? err.message : "WHOIS failed" });
  }
});

// ─── ARP TABLE ────────────────────────────────────────────────────────────────
router.get("/diagnostics/arp", async (_req, res): Promise<void> => {
  try {
    const result = await getArpTable();
    res.json(result);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "ARP table failed" });
  }
});

// ─── INTERFACES ───────────────────────────────────────────────────────────────
router.get("/diagnostics/interfaces", (_req, res): void => {
  const interfaces = getNetworkInterfaces();
  res.json(interfaces);
});

// ─── OVERVIEW ─────────────────────────────────────────────────────────────────
router.get("/diagnostics/overview", async (req, res): Promise<void> => {
  try {
    const db = await getDB();
    const allRuns = await db.select().from(diagnosticRunsTable).orderBy(diagnosticRunsTable.startedAt);
    const recent = [...allRuns].slice(-5).reverse();

    const pingRuns = allRuns.filter(r => r.type === "ping" && r.metrics && (r.metrics as Record<string, unknown>).latencyAvg != null);
    const avgLatency = pingRuns.length ? pingRuns.reduce((s, r) => s + (((r.metrics as Record<string, unknown>).latencyAvg as number) ?? 0), 0) / pingRuns.length : null;

    const lossRuns = allRuns.filter(r => r.type === "ping" && r.metrics && (r.metrics as Record<string, unknown>).packetLoss != null);
    const avgLoss = lossRuns.length ? lossRuns.reduce((s, r) => s + (((r.metrics as Record<string, unknown>).packetLoss as number) ?? 0), 0) / lossRuns.length : null;

    const jitterRuns = allRuns.filter(r => r.type === "ping" && r.metrics && (r.metrics as Record<string, unknown>).jitter != null);
    const avgJitter = jitterRuns.length ? jitterRuns.reduce((s, r) => s + (((r.metrics as Record<string, unknown>).jitter as number) ?? 0), 0) / jitterRuns.length : null;

    const dnsRuns = allRuns.filter(r => r.type === "dns");
    const avgDnsTime = dnsRuns.length ? dnsRuns.reduce((s, r) => s + (r.durationMs ?? 0), 0) / dnsRuns.length : null;

    const total = allRuns.length;
    const successful = allRuns.filter(r => r.status === "success").length;
    const successRate = total > 0 ? (successful / total) * 100 : null;

    const latencyTrend = buildTrend(pingRuns, r => ((r.metrics as Record<string, unknown>)?.latencyAvg as number | null) ?? null);
    const packetLossTrend = buildTrend(pingRuns, r => ((r.metrics as Record<string, unknown>)?.packetLoss as number | null) ?? null);

    res.json({
      avgLatency: avgLatency != null ? Math.round(avgLatency * 100) / 100 : null,
      packetLoss: avgLoss != null ? Math.round(avgLoss * 100) / 100 : null,
      avgJitter: avgJitter != null ? Math.round(avgJitter * 100) / 100 : null,
      dnsResolutionTime: avgDnsTime != null ? Math.round(avgDnsTime) : null,
      totalRuns: total,
      successRate: successRate != null ? Math.round(successRate * 10) / 10 : null,
      activeAlerts: allRuns.filter(r => r.status === "failure" && r.startedAt.getTime() > Date.now() - 60 * 60 * 1000).length,
      uptimePercent: successRate,
      latencyTrend,
      packetLossTrend,
      recentRuns: recent.map(formatRun),
    });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : "Unknown error" });
  }
});

type RunRow = typeof diagnosticRunsTable.$inferSelect;

function buildTrend(runs: RunRow[], getValue: (r: RunRow) => number | null) {
  const buckets: Record<string, number[]> = {};
  const now = Date.now();
  for (let i = 23; i >= 0; i--) {
    const ts = new Date(now - i * 60 * 60 * 1000);
    const key = `${ts.getFullYear()}-${ts.getMonth()}-${ts.getDate()}-${ts.getHours()}`;
    buckets[key] = [];
  }
  for (const run of runs) {
    const d = run.startedAt;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
    if (key in buckets) { const v = getValue(run); if (v != null) buckets[key].push(v); }
  }
  return Object.entries(buckets).map(([key, vals]) => {
    const [y, mo, d, h] = key.split("-").map(Number);
    const ts = new Date(y, mo, d, h);
    const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
    return { timestamp: ts.toISOString(), value: avg != null ? Math.round(avg * 100) / 100 : null };
  });
}

function formatRun(run: RunRow) {
  return {
    id: run.id,
    type: run.type,
    target: run.target,
    status: run.status,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString() ?? null,
    durationMs: run.durationMs,
    demoMode: run.demoMode,
    rawOutput: run.rawOutput,
    parsedResult: run.parsedResult,
    metrics: run.metrics,
    hops: run.hops,
    dnsRecords: run.dnsRecords,
    error: run.error,
    parseWarnings: run.parseWarnings ?? [],
  };
}

export default router;
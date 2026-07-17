import { Router } from "express";
import { getDb, diagnosticRunsTable } from "@workspace/db";
import { eq, desc, gte } from "drizzle-orm";

const router = Router();

// GET /api/alerts — derive alerts from recent failed runs
router.get("/alerts", async (req, res) => {
  const db = getDb();
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentFailures = await db
    .select()
    .from(diagnosticRunsTable)
    .where(gte(diagnosticRunsTable.startedAt, oneHourAgo))
    .orderBy(desc(diagnosticRunsTable.startedAt))
    .limit(50);

  const alerts = recentFailures
    .filter(r => r.status === "failure" || r.status === "partial")
    .map((r) => {
      const severity = r.status === "failure" ? "error" : "warning";
      const metrics = (r.metrics ?? {}) as Record<string, unknown>;
      const loss = metrics.packetLoss as number | null;
      let detail: string | null = null;
      if (r.type === "ping" && loss != null && loss > 0) {
        detail = `${loss}% packet loss`;
      }
      return {
        id: `run-${r.id}`,
        severity,
        message: `${r.type.charAt(0).toUpperCase() + r.type.slice(1)} to ${r.target} failed`,
        detail: detail ?? r.error ?? null,
        target: r.target,
        triggeredAt: r.startedAt?.toISOString(),
        resolved: false,
      };
    });

  res.json(alerts);
});

export default router;
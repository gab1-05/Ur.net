import { Router } from "express";
import { db } from "@workspace/db";
import { diagnosticRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /api/export/run/:id/json
router.get("/export/run/:id/json", async (req, res): Promise<void> => {
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
  res.setHeader("Content-Disposition", `attachment; filename="diagnostic-run-${id}.json"`);
  res.json(run);
});

// GET /api/export/run/:id/csv
router.get("/export/run/:id/csv", async (req, res): Promise<void> => {
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

  const metrics = (run.metrics ?? {}) as Record<string, unknown>;
  const headers = ["id","type","target","status","startedAt","completedAt","durationMs","demoMode","latencyMin","latencyMax","latencyAvg","packetLoss","jitter","hopCount","error"];
  const row = [
    run.id, run.type, run.target, run.status,
    run.startedAt?.toISOString() ?? "",
    run.completedAt?.toISOString() ?? "",
    run.durationMs ?? "",
    run.demoMode,
    metrics.latencyMin ?? "",
    metrics.latencyMax ?? "",
    metrics.latencyAvg ?? "",
    metrics.packetLoss ?? "",
    metrics.jitter ?? "",
    metrics.hopCount ?? "",
    run.error ?? "",
  ];

  const csvLines = [
    headers.join(","),
    row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","),
  ];

  if (run.hops && Array.isArray(run.hops)) {
    csvLines.push("");
    csvLines.push("hop,host,ip,rtt1,rtt2,rtt3,timeout");
    for (const h of run.hops as Array<Record<string, unknown>>) {
      csvLines.push(`${h.hop},"${h.host ?? ""}","${h.ip ?? ""}",${h.rtt1 ?? ""},${h.rtt2 ?? ""},${h.rtt3 ?? ""},${h.timeout}`);
    }
  }

  if (run.dnsRecords && Array.isArray(run.dnsRecords)) {
    csvLines.push("");
    csvLines.push("type,name,value,ttl");
    for (const r of run.dnsRecords as Array<Record<string, unknown>>) {
      csvLines.push(`"${r.type}","${r.name}","${r.value}",${r.ttl ?? ""}`);
    }
  }

  const csv = csvLines.join("\n");
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="diagnostic-run-${id}.csv"`);
  res.send(csv);
});

export default router;

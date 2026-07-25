import { Router } from "express";
import { getDb, diagnosticRunsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { withDatabase } from "../middlewares/withDatabase.js";

const router = Router();

router.get("/export/run/:id/json", withDatabase(async (req, res, _next, db) => {
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
}));

router.get("/export/run/:id/csv", withDatabase(async (req, res, _next, db) => {
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

  const csv = [
    "id,type,target,status,startedAt,completedAt,durationMs,demoMode,error",
    `${run.id},"${run.type}","${run.target}","${run.status}","${run.startedAt?.toISOString()}","${run.completedAt?.toISOString() ?? ""}",${run.durationMs ?? ""},${run.demoMode},"${run.error ?? ""}"`
  ].join("\n");

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="run-${id}.csv"`);
  res.send(csv);
}));

export default router;

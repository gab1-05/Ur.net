import { Request, Response, NextFunction } from "express";
import { getDb, isDatabaseAvailable } from "@workspace/db";

export function withDatabase<T extends Request = Request>(
  handler: (req: T, res: Response, next: NextFunction, db: ReturnType<typeof getDb>) => Promise<void> | void,
) {
  return async (req: T, res: Response, next: NextFunction) => {
    if (!isDatabaseAvailable()) {
      res.status(503).json({ error: "Database is not configured. Set DATABASE_URL to enable persistence." });
      return;
    }
    try {
      const db = getDb();
      await handler(req, res, next, db);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      res.status(500).json({ error: message });
    }
  };
}
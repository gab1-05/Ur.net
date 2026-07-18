import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let db: ReturnType<typeof drizzle> | null = null;

function ensureDatabase() {
  if (!process.env.DATABASE_URL) {
    return false;
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
  }
  return true;
}

export function getDb() {
  const ok = ensureDatabase();
  if (!ok || !db) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL to enable persistence.",
    );
  }
  return db;
}

export function getPool() {
  const ok = ensureDatabase();
  if (!ok || !pool) {
    throw new Error(
      "Database is not configured. Set DATABASE_URL to enable persistence.",
    );
  }
  return pool;
}

export function isDatabaseAvailable(): boolean {
  return ensureDatabase() && !!db;
}

export * from "./schema";

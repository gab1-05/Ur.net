import pg from "pg";

const { Client } = pg;

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("DATABASE_URL is required. Example: postgres://postgres:postgres@localhost:5432/urnet");
  process.exit(1);
}

const target = new URL(databaseUrl);
const dbName = target.pathname.replace(/^\//, "");

if (!dbName) {
  console.error("DATABASE_URL must include a database name.");
  process.exit(1);
}

const adminUrl = process.env.DATABASE_ADMIN_URL ?? (() => {
  const url = new URL(databaseUrl);
  url.pathname = "/postgres";
  return url.toString();
})();

async function createDatabaseIfMissing() {
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    const exists = await admin.query("select 1 from pg_database where datname = $1", [dbName]);
    if (exists.rowCount === 0) {
      await admin.query(`create database "${dbName.replaceAll('"', '""')}"`);
      console.log(`Created database "${dbName}".`);
    } else {
      console.log(`Database "${dbName}" already exists.`);
    }
  } finally {
    await admin.end();
  }
}

async function createSchema() {
  const db = new Client({ connectionString: databaseUrl });
  await db.connect();
  try {
    await db.query(`
      create table if not exists diagnostic_runs (
        id serial primary key,
        type text not null,
        target text not null,
        status text not null default 'running',
        started_at timestamp not null default now(),
        completed_at timestamp,
        duration_ms integer,
        demo_mode boolean not null default false,
        raw_output text,
        parsed_result jsonb,
        metrics jsonb,
        hops jsonb,
        dns_records jsonb,
        error text,
        parse_warnings jsonb default '[]'::jsonb,
        config jsonb
      );
    `);

    await db.query(`
      create table if not exists profiles (
        id serial primary key,
        name text not null,
        description text,
        category text not null default 'custom',
        targets jsonb not null default '[]'::jsonb,
        diagnostics jsonb not null default '[]'::jsonb,
        config jsonb default '{}'::jsonb,
        last_run_at timestamp,
        created_at timestamp not null default now(),
        is_preset boolean not null default false
      );
    `);

    await db.query("create index if not exists diagnostic_runs_started_at_idx on diagnostic_runs (started_at desc);");
    await db.query("create index if not exists diagnostic_runs_type_idx on diagnostic_runs (type);");
    await db.query("create index if not exists diagnostic_runs_status_idx on diagnostic_runs (status);");

    await db.query(`
      insert into profiles (name, description, category, targets, diagnostics, config, is_preset)
      values
        ('Gaming Latency Check', 'Check latency to popular gaming servers and DNS', 'preset', '["8.8.8.8","1.1.1.1","steam.com"]'::jsonb, '["ping","dns"]'::jsonb, '{"count":8}'::jsonb, true),
        ('DNS Issue Check', 'Diagnose DNS resolution problems', 'preset', '["google.com","cloudflare.com","8.8.8.8"]'::jsonb, '["dns","ping"]'::jsonb, '{"recordType":"A"}'::jsonb, true),
        ('Office Network Quick Test', 'Quick health check for office network connectivity', 'preset', '["8.8.8.8","google.com"]'::jsonb, '["ping","traceroute","dns"]'::jsonb, '{}'::jsonb, true),
        ('Router Reachability', 'Test gateway and local network reachability', 'preset', '["192.168.1.1","10.0.0.1"]'::jsonb, '["ping"]'::jsonb, '{"count":6}'::jsonb, true)
      on conflict do nothing;
    `);

    console.log("Schema is ready.");
  } finally {
    await db.end();
  }
}

try {
  await createDatabaseIfMissing();
  await createSchema();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}

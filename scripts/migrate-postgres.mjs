import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const migrationsDir = fileURLToPath(new URL('../drizzle/', import.meta.url));
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is not configured');

const client = new pg.Client({ connectionString, connectionTimeoutMillis: 5000 });

function postgresDdl(source) {
  return source
    .replace(/^PRAGMA\s+optimize\s*;?\s*$/gim, '')
    .replace(/\bCOLLATE\s+NOCASE\b/gi, '')
    .replace(/\bINTEGER\b/gi, 'BIGINT')
    .replace(/\bREAL\b/gi, 'DOUBLE PRECISION')
    .replace(/\bDEFAULT\s+CURRENT_TIMESTAMP\b/gi, "DEFAULT (datetime('now'))");
}

const compatibilityFunctions = `
CREATE OR REPLACE FUNCTION datetime(value text, modifier text DEFAULT NULL)
RETURNS text LANGUAGE SQL STABLE AS $$
  SELECT to_char(
    (CASE WHEN value = 'now' THEN now() ELSE value::timestamptz END AT TIME ZONE 'UTC')
      + COALESCE(modifier::interval, interval '0 seconds'),
    'YYYY-MM-DD HH24:MI:SS'
  )
$$;

CREATE OR REPLACE FUNCTION json_extract(value text, path text)
RETURNS text LANGUAGE SQL IMMUTABLE AS $$
  SELECT value::jsonb #>> string_to_array(substr(path, 3), '.')
$$;

CREATE OR REPLACE FUNCTION json_valid(value text)
RETURNS boolean LANGUAGE plpgsql IMMUTABLE AS $$
BEGIN
  PERFORM value::jsonb;
  RETURN true;
EXCEPTION WHEN others THEN
  RETURN false;
END
$$;

CREATE OR REPLACE FUNCTION sqlite_group_concat(state text, value text)
RETURNS text LANGUAGE SQL IMMUTABLE AS $$
  SELECT CASE WHEN value IS NULL THEN state WHEN state IS NULL THEN value ELSE state || ',' || value END
$$;

DO $$ BEGIN
  CREATE AGGREGATE group_concat(text) (
    SFUNC = sqlite_group_concat,
    STYPE = text
  );
EXCEPTION WHEN duplicate_function THEN NULL;
END $$;
`;

try {
  await client.connect();
  await client.query(compatibilityFunctions);
  await client.query(`CREATE TABLE IF NOT EXISTS postgres_migrations (
    name text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )`);
  const applied = new Set((await client.query('SELECT name FROM postgres_migrations')).rows.map((row) => row.name));
  const files = (await readdir(migrationsDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
  for (const name of files) {
    if (applied.has(name)) continue;
    const contents = postgresDdl(await readFile(path.join(migrationsDir, name), 'utf8'));
    await client.query('BEGIN');
    try {
      if (contents.trim()) await client.query(contents);
      await client.query('INSERT INTO postgres_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      process.stdout.write(`Applied ${name}\n`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`PostgreSQL migration ${name} failed: ${error.message}`, { cause: error });
    }
  }
  await client.query('CREATE UNIQUE INDEX IF NOT EXISTS idx_auth_credentials_login_lower ON auth_credentials (lower(login))');
  process.stdout.write(`PostgreSQL migrations: ${files.length} current\n`);
} finally {
  await client.end();
}

import pg from 'pg';

const { Pool, types } = pg;

// D1 returns numeric values as JavaScript numbers. Keep that contract while the
// application moves to PostgreSQL; prices and counters stay below MAX_SAFE_INTEGER.
types.setTypeParser(20, (value) => Number(value));
types.setTypeParser(1700, (value) => Number(value));

let pool: pg.Pool | undefined;

function connectionPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not configured');
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      statement_timeout: 15_000,
    });
  }
  return pool;
}

function placeholders(sql: string) {
  let result = '';
  let quote: "'" | '"' | null = null;
  let index = 0;
  for (let i = 0; i < sql.length; i += 1) {
    const char = sql[i];
    if (quote) {
      result += char;
      if (char === quote) {
        if (sql[i + 1] === quote) result += sql[++i];
        else quote = null;
      }
    } else if (char === "'" || char === '"') {
      quote = char;
      result += char;
    } else if (char === '?') {
      result += `$${++index}`;
    } else {
      result += char;
    }
  }
  return result;
}

export function postgresSql(source: string) {
  let sql = source.trim().replace(/;\s*$/, '');
  if (/^PRAGMA optimize$/i.test(sql)) return null;
  if (/^PRAGMA table_info\(complexes\)$/i.test(sql)) {
    return "SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = 'complexes'";
  }
  const ignoreConflict = /^INSERT OR IGNORE\s+INTO\b/i.test(sql);
  if (ignoreConflict) sql = sql.replace(/^INSERT OR IGNORE\s+INTO\b/i, 'INSERT INTO');
  sql = sql
    .replace(/\b(FROM|JOIN)\s+users\s+user\b/gi, '$1 users "user"')
    .replace(/\buser\./gi, '"user".')
    .replace(/\bCOLLATE\s+NOCASE\b/gi, '')
    .replace(/\bCURRENT_TIMESTAMP\b/gi, "datetime('now')")
    .replace(/\bAS\s+REAL\b/gi, 'AS DOUBLE PRECISION');
  if (ignoreConflict) {
    const returning = /\bRETURNING\b/i.exec(sql);
    if (returning) sql = `${sql.slice(0, returning.index)} ON CONFLICT DO NOTHING ${sql.slice(returning.index)}`;
    else sql += ' ON CONFLICT DO NOTHING';
  }
  return placeholders(sql);
}

class PostgresStatement {
  private values: unknown[] = [];

  constructor(private readonly sql: string, private readonly database: PostgresD1) {}

  bind(...values: unknown[]) {
    this.values = values;
    return this;
  }

  async execute(client?: pg.PoolClient) {
    const translated = postgresSql(this.sql);
    if (!translated) return { rows: [], rowCount: 0 };
    const executor = client ?? connectionPool();
    return executor.query(translated, this.values);
  }

  async all<T>() {
    const result = await this.execute();
    return { success: true, results: result.rows as T[], meta: { changes: result.rowCount ?? 0 } };
  }

  async first<T>() {
    const result = await this.execute();
    return (result.rows[0] as T | undefined) ?? null;
  }

  async run<T>() {
    const result = await this.execute();
    return { success: true, results: result.rows as T[], meta: { changes: result.rowCount ?? 0 } };
  }
}

class PostgresD1 {
  prepare(sql: string) {
    return new PostgresStatement(sql, this);
  }

  async batch(statements: PostgresStatement[]) {
    const client = await connectionPool().connect();
    try {
      await client.query('BEGIN');
      const results = [];
      for (const statement of statements) {
        const result = await statement.execute(client);
        results.push({ success: true, results: result.rows, meta: { changes: result.rowCount ?? 0 } });
      }
      await client.query('COMMIT');
      return results;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

const database = new PostgresD1();

export function postgresDatabase(): D1Database {
  return database as unknown as D1Database;
}

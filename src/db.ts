import { Pool } from "pg";

const CREATE_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS products (
    id          SERIAL PRIMARY KEY,
    name        TEXT        NOT NULL,
    description TEXT        NOT NULL DEFAULT '',
    price       NUMERIC(10,2) NOT NULL CHECK (price >= 0),
    stock       INTEGER     NOT NULL DEFAULT 0 CHECK (stock >= 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('english', name));
`;

/** Creates a pool and verifies connectivity. Used for the local dev server. */
export async function connectDB(): Promise<Pool> {
  const databaseUrl = process.env["DATABASE_URL"];
  if (!databaseUrl) {
    throw new Error("DATABASE_URL environment variable is not set");
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    max: 25,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  const client = await pool.connect();
  try {
    await client.query("SELECT 1");
    console.log("[db] connected to PostgreSQL");
  } finally {
    client.release();
  }

  return pool;
}

/**
 * Returns a singleton pool suitable for serverless environments.
 * Does not verify connectivity at creation time — the first query will surface
 * any connection errors. Uses a smaller pool size since serverless functions
 * are short-lived and connections should not linger.
 */
let _pool: Pool | null = null;

export function getPool(): Pool {
  if (!_pool) {
    const databaseUrl = process.env["DATABASE_URL"];
    if (!databaseUrl) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    _pool = new Pool({
      connectionString: databaseUrl,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 5_000,
    });
  }
  return _pool;
}

export async function runMigrations(db: Pool): Promise<void> {
  await db.query(CREATE_TABLE_SQL);
  console.log("[db] migrations complete");
}

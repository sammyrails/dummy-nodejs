import "dotenv/config";
import { createApp } from "../src/app";
import { getPool, runMigrations } from "../src/db";

const db = getPool();

// Run migrations once per cold start (idempotent — uses IF NOT EXISTS).
runMigrations(db).catch((err) => {
  console.error("[db] migration error", err);
});

export default createApp(db);

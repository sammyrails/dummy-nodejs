import "dotenv/config";
import { createApp } from "./app";
import { connectDB, runMigrations } from "./db";

const PORT = parseInt(process.env["PORT"] ?? "3000", 10);

async function main(): Promise<void> {
  const db = await connectDB();
  await runMigrations(db);

  const app = createApp(db);

  const server = app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}`);
  });

  const shutdown = (): void => {
    console.log("\n[server] shutting down…");
    server.close(() => {
      db.end().then(() => process.exit(0)).catch(() => process.exit(1));
    });
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});

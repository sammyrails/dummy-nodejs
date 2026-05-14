import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";

export function errorRouter(db: Pool): Router {
  const router = Router();

  // ── GET /error/panic ────────────────────────────────────────────────────
  // Throws an unhandled error to test the global Express error handler.

  router.get("/panic", (_req: Request, _res: Response): void => {
    throw new Error("intentional panic — testing error capture");
  });

  // ── GET /error/notfound ─────────────────────────────────────────────────

  router.get("/notfound", (_req: Request, res: Response): void => {
    res.status(404).json({
      error: "the resource you are looking for does not exist",
      code: "NOT_FOUND",
    });
  });

  // ── GET /error/db ───────────────────────────────────────────────────────
  // Runs an intentionally invalid SQL query to trigger a DB error.

  router.get("/db", async (_req: Request, res: Response): Promise<void> => {
    try {
      await db.query("SELECT * FROM this_table_does_not_exist_at_all");
      res.json({ ok: true });
    } catch (err) {
      const error = err as Error;
      console.error("[error/db] bad query:", error.message);
      res.status(500).json({
        error: "database error",
        code: "DB_ERROR",
        message: error.message,
      });
    }
  });

  // ── GET /error/validation ───────────────────────────────────────────────

  router.get("/validation", (_req: Request, res: Response): void => {
    res.status(422).json({
      error: "validation failed",
      code: "VALIDATION_ERROR",
      details: [
        { field: "email", message: "must be a valid email address" },
        { field: "age", message: "must be a positive integer" },
      ],
    });
  });

  // ── GET /error/timeout ──────────────────────────────────────────────────
  // Simulates a slow operation to test latency.

  router.get("/timeout", (_req: Request, res: Response): void => {
    const DELAY_MS = 3_000;

    setTimeout(() => {
      res.status(503).json({
        error: "request timed out",
        code: "TIMEOUT",
        delay_ms: DELAY_MS,
      });
    }, DELAY_MS);
  });

  return router;
}

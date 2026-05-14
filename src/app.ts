import express, { type Application, type Request, type Response, type NextFunction } from "express";
import type { Pool } from "pg";
import { productsRouter } from "./routes/products";
import { errorRouter } from "./routes/errors";

export function createApp(db: Pool): Application {
  const app = express();

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const reqId = req.headers["x-request-id"] as string | undefined ?? generateId();
    res.setHeader("x-request-id", reqId);
    next();
  });

  app.get("/health", (_req: Request, res: Response) => {
    db.query("SELECT 1")
      .then(() => res.json({ status: "ok", service: "products-crud-api" }))
      .catch((err: Error) => {
        console.error("[health] db ping failed", err.message);
        res.status(503).json({ status: "unhealthy", error: err.message });
      });
  });

  app.use("/products", productsRouter(db));
  app.use("/error", errorRouter(db));

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "not found", code: "NOT_FOUND" });
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[unhandled error]", err.message);
    res.status(500).json({ error: "internal server error", code: "INTERNAL_ERROR", message: err.message });
  });

  return app;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10);
}

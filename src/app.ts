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

  app.get("/", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Products API</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #0f0f0f;
      color: #f0f0f0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .card {
      text-align: center;
      padding: 3rem 4rem;
      border: 1px solid #2a2a2a;
      border-radius: 16px;
      background: #161616;
      max-width: 480px;
      width: 100%;
    }
    .dot {
      display: inline-block;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #22c55e;
      margin-right: 8px;
      animation: pulse 2s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.4; }
    }
    h1 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.5rem; }
    p  { color: #888; font-size: 0.9rem; margin-bottom: 2rem; }
    .endpoints {
      list-style: none;
      text-align: left;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .endpoints li {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 0.85rem;
    }
    .method {
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 4px;
      min-width: 48px;
      text-align: center;
      letter-spacing: 0.05em;
    }
    .get    { background: #1d3a2a; color: #22c55e; }
    .post   { background: #1e2f4a; color: #60a5fa; }
    .put    { background: #3a2e10; color: #fbbf24; }
    .delete { background: #3a1a1a; color: #f87171; }
    code { color: #a78bfa; font-family: monospace; }
  </style>
</head>
<body>
  <div class="card">
    <h1><span class="dot"></span>Products API</h1>
    <p>API is up and running.</p>
    <ul class="endpoints">
      <li><span class="method get">GET</span>    <code>/health</code></li>
      <li><span class="method get">GET</span>    <code>/products</code></li>
      <li><span class="method get">GET</span>    <code>/products/:id</code></li>
      <li><span class="method get">GET</span>    <code>/products/search?q=</code></li>
      <li><span class="method post">POST</span>  <code>/products</code></li>
      <li><span class="method put">PUT</span>    <code>/products/:id</code></li>
      <li><span class="method delete">DEL</span> <code>/products/:id</code></li>
    </ul>
  </div>
</body>
</html>`);
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

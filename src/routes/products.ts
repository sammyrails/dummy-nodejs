import { Router, type Request, type Response } from "express";
import type { Pool } from "pg";
import type { CreateProductBody, UpdateProductBody, Product, ListResponse } from "../types";

export function productsRouter(db: Pool): Router {
  const router = Router();

  // ── POST /products ──────────────────────────────────────────────────────

  router.post("/", async (req: Request, res: Response): Promise<void> => {
    const body = req.body as Partial<CreateProductBody>;

    if (!body.name || body.price === undefined) {
      res.status(422).json({ error: "name and price are required", code: "VALIDATION_ERROR" });
      return;
    }

    try {
      const result = await db.query<Product>(
        `INSERT INTO products (name, description, price, stock)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [body.name, body.description ?? "", body.price, body.stock ?? 0],
      );

      res.status(201).json(result.rows[0]);
    } catch (err) {
      const error = err as Error;
      console.error("[products] create failed", error.message);
      res.status(500).json({ error: "failed to create product", code: "DB_ERROR" });
    }
  });

  // ── GET /products ───────────────────────────────────────────────────────

  router.get("/", async (req: Request, res: Response): Promise<void> => {
    const limit = Math.min(parseInt(req.query["limit"] as string ?? "50", 10), 200);
    const offset = parseInt(req.query["offset"] as string ?? "0", 10);

    try {
      const [rows, count] = await Promise.all([
        db.query<Product>(
          `SELECT * FROM products ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset],
        ),
        db.query<{ total: string }>("SELECT COUNT(*) AS total FROM products"),
      ]);

      const response: ListResponse<Product> = {
        data: rows.rows,
        total: parseInt(count.rows[0].total, 10),
      };

      res.json(response);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: "failed to list products", code: "DB_ERROR", message: error.message });
    }
  });

  // ── GET /products/search ────────────────────────────────────────────────

  router.get("/search", async (req: Request, res: Response): Promise<void> => {
    const q = (req.query["q"] as string ?? "").trim();

    if (!q) {
      res.status(422).json({ error: "query parameter q is required", code: "VALIDATION_ERROR" });
      return;
    }

    try {
      const result = await db.query<Product>(
        `SELECT * FROM products WHERE name ILIKE $1 OR description ILIKE $1 ORDER BY created_at DESC LIMIT 50`,
        [`%${q}%`],
      );

      res.json({ data: result.rows, total: result.rows.length, query: q });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: "search failed", code: "DB_ERROR", message: error.message });
    }
  });

  // ── GET /products/:id ───────────────────────────────────────────────────

  router.get("/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params["id"] ?? "", 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id must be a positive integer", code: "INVALID_ID" });
      return;
    }

    try {
      const result = await db.query<Product>("SELECT * FROM products WHERE id = $1", [id]);

      if (result.rows.length === 0) {
        res.status(404).json({ error: "product not found", code: "NOT_FOUND" });
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: "failed to fetch product", code: "DB_ERROR", message: error.message });
    }
  });

  // ── PUT /products/:id ───────────────────────────────────────────────────

  router.put("/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params["id"] ?? "", 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id must be a positive integer", code: "INVALID_ID" });
      return;
    }

    const body = req.body as Partial<UpdateProductBody>;

    if (!body.name && body.price === undefined && body.stock === undefined && body.description === undefined) {
      res.status(422).json({ error: "at least one field is required", code: "VALIDATION_ERROR" });
      return;
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (body.name !== undefined) { fields.push(`name = $${idx++}`); values.push(body.name); }
    if (body.description !== undefined) { fields.push(`description = $${idx++}`); values.push(body.description); }
    if (body.price !== undefined) { fields.push(`price = $${idx++}`); values.push(body.price); }
    if (body.stock !== undefined) { fields.push(`stock = $${idx++}`); values.push(body.stock); }
    fields.push(`updated_at = $${idx++}`);
    values.push(new Date());
    values.push(id);

    try {
      const result = await db.query<Product>(
        `UPDATE products SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values,
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "product not found", code: "NOT_FOUND" });
        return;
      }

      res.json(result.rows[0]);
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: "failed to update product", code: "DB_ERROR", message: error.message });
    }
  });

  // ── DELETE /products/:id ────────────────────────────────────────────────

  router.delete("/:id", async (req: Request, res: Response): Promise<void> => {
    const id = parseInt(req.params["id"] ?? "", 10);

    if (!Number.isInteger(id) || id <= 0) {
      res.status(400).json({ error: "id must be a positive integer", code: "INVALID_ID" });
      return;
    }

    try {
      const result = await db.query<Product>(
        "DELETE FROM products WHERE id = $1 RETURNING *",
        [id],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: "product not found", code: "NOT_FOUND" });
        return;
      }

      res.status(200).json({ deleted: true, product: result.rows[0] });
    } catch (err) {
      const error = err as Error;
      res.status(500).json({ error: "failed to delete product", code: "DB_ERROR", message: error.message });
    }
  });

  return router;
}

# Tracelit Node.js SDK — Products CRUD Dummy App

A minimal Express + PostgreSQL CRUD API wired with the Tracelit SDK to
showcase automatic and manual instrumentation: traces, metrics, logs, and
intentional error paths.

## Requirements

- Node.js ≥ 18
- PostgreSQL 14+ running locally (Homebrew: `brew services start postgresql@16`)

## Setup

```bash
npm install
cp .env.example .env
# edit .env — set TRACELIT_API_KEY and verify DATABASE_URL
```

Create the database:

```bash
createdb products_crud
```

Start the server (TypeScript, no build step):

```bash
npm run dev
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/products` | Create product |
| `GET` | `/products` | List all products |
| `GET` | `/products/:id` | Get product by ID |
| `PUT` | `/products/:id` | Update product |
| `DELETE` | `/products/:id` | Delete product |
| `GET` | `/products/search?q=term` | Search products (slow query demo) |
| `GET` | `/error/panic` | Triggers a thrown error (500) |
| `GET` | `/error/notfound` | Returns 404 |
| `GET` | `/error/db` | Runs a bad SQL query |
| `GET` | `/error/validation` | Returns 422 validation error |
| `GET` | `/error/timeout` | Simulates a 3 s timeout |

## Testing

```bash
./test.sh
```

Runs all normal CRUD flows and all destructive/error paths to generate traces
visible in the Tracelit dashboard.

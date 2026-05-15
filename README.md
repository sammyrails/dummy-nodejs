# Products CRUD API

A minimal Express + PostgreSQL CRUD API.

## Requirements

- Node.js ≥ 18
- PostgreSQL 14+ running locally (Homebrew: `brew services start postgresql@16`)

## Setup

```bash
npm install
cp .env.example .env
# edit .env — verify DATABASE_URL
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
| `GET` | `/` | Status page |
| `GET` | `/health` | Health check |
| `POST` | `/products` | Create product |
| `GET` | `/products` | List all products |
| `GET` | `/products/:id` | Get product by ID |
| `PUT` | `/products/:id` | Update product |
| `DELETE` | `/products/:id` | Delete product |
| `GET` | `/products/search?q=term` | Search products |
| `GET` | `/error/panic` | Triggers a thrown error (500) |
| `GET` | `/error/notfound` | Returns 404 |
| `GET` | `/error/db` | Runs a bad SQL query |
| `GET` | `/error/validation` | Returns 422 validation error |
| `GET` | `/error/timeout` | Simulates a 3 s timeout |

## Testing

```bash
./test.sh
```

## Deploy

Deploys to Vercel via the GitHub Actions workflow in `.github/workflows/dply.yaml`.
Set `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, and `VERCEL_TOKEN` as repository secrets,
and add `DATABASE_URL` to your Vercel project environment variables.

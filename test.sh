#!/usr/bin/env bash
# test.sh — End-to-end test script for the Tracelit Node.js CRUD dummy app.
#
# Tests both NORMAL (happy-path CRUD) and DESTRUCTIVE (error/edge-case) flows
# so the Tracelit dashboard receives a rich variety of traces and error spans.
#
# Usage:
#   ./test.sh              # expects server running on localhost:3000
#   BASE_URL=http://localhost:4000 ./test.sh
#
# Prerequisites: curl, jq

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0
SKIP=0

# ── colour helpers ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

log()  { echo -e "${CYAN}[test]${RESET} $*"; }
pass() { echo -e "  ${GREEN}✓${RESET} $*"; PASS=$((PASS + 1)); }
fail() { echo -e "  ${RED}✗${RESET} $*"; FAIL=$((FAIL + 1)); }
skip() { echo -e "  ${YELLOW}−${RESET} $*"; SKIP=$((SKIP + 1)); }
section() { echo -e "\n${BOLD}══ $* ══${RESET}"; }

# ── core assertion helpers ──────────────────────────────────────────────────
assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$desc (HTTP $actual)"
  else
    fail "$desc — expected HTTP $expected, got $actual"
  fi
}

assert_json_field() {
  local desc="$1" field="$2" expected="$3" body="$4"
  local actual
  actual=$(echo "$body" | jq -r "$field" 2>/dev/null || echo "__jq_error__")
  if [[ "$actual" == "$expected" ]]; then
    pass "$desc (.${field} == '${expected}')"
  else
    fail "$desc — expected .${field}='${expected}', got '${actual}'"
  fi
}

# Perform a request and capture status + body.
# Usage: do_request METHOD PATH [body_json]
# Sets: $STATUS $BODY
do_request() {
  local method="$1" path="$2" body="${3:-}"
  local args=(-s -o /tmp/tl_body -w "%{http_code}" -X "$method")
  if [[ -n "$body" ]]; then
    args+=(-H "Content-Type: application/json" -d "$body")
  fi
  STATUS=$(curl "${args[@]}" "${BASE_URL}${path}")
  BODY=$(cat /tmp/tl_body)
}

# ── wait for server ─────────────────────────────────────────────────────────
section "Waiting for server"
for i in $(seq 1 20); do
  if curl -sf "${BASE_URL}/health" > /dev/null 2>&1; then
    pass "server is up at ${BASE_URL}"
    break
  fi
  if [[ $i -eq 20 ]]; then
    fail "server did not start within 10 s — start it with: npm run dev"
    exit 1
  fi
  sleep 0.5
done

# ── health check ─────────────────────────────────────────────────────────────
section "Health check"
do_request GET /health
assert_status "GET /health" 200 "$STATUS"
assert_json_field "status field" ".status" "ok" "$BODY"

# ── NORMAL: CRUD operations ──────────────────────────────────────────────────
section "Normal — Create products"

do_request POST /products '{"name":"Widget Pro","description":"A high-quality widget","price":29.99,"stock":100}'
assert_status "POST /products (valid)" 201 "$STATUS"
PRODUCT_ID=$(echo "$BODY" | jq -r '.id')
assert_json_field "product name" ".name" "Widget Pro" "$BODY"
assert_json_field "product price" ".price" "29.99" "$BODY"
log "Created product ID: $PRODUCT_ID"

do_request POST /products '{"name":"Gadget Basic","price":9.99}'
assert_status "POST /products (no description/stock)" 201 "$STATUS"
PRODUCT_ID2=$(echo "$BODY" | jq -r '.id')
log "Created product ID: $PRODUCT_ID2"

do_request POST /products '{"name":"Super Deluxe Thingamajig","description":"Top shelf item","price":199.99,"stock":5}'
assert_status "POST /products (premium item)" 201 "$STATUS"
PRODUCT_ID3=$(echo "$BODY" | jq -r '.id')
log "Created product ID: $PRODUCT_ID3"

section "Normal — List products"
do_request GET /products
assert_status "GET /products" 200 "$STATUS"
assert_json_field "data is array" ".data | type" "array" "$BODY"
TOTAL=$(echo "$BODY" | jq -r '.total')
pass "total products: $TOTAL"

do_request GET "/products?limit=2&offset=0"
assert_status "GET /products with pagination" 200 "$STATUS"
COUNT=$(echo "$BODY" | jq '.data | length')
if [[ "$COUNT" -le 2 ]]; then
  pass "pagination limit respected (got $COUNT)"
else
  fail "expected ≤2 results, got $COUNT"
fi

section "Normal — Get product by ID"
do_request GET "/products/$PRODUCT_ID"
assert_status "GET /products/:id (exists)" 200 "$STATUS"
assert_json_field "correct id" ".id" "$PRODUCT_ID" "$BODY"

section "Normal — Search products"
do_request GET "/products/search?q=widget"
assert_status "GET /products/search?q=widget" 200 "$STATUS"
assert_json_field "search returns array" ".data | type" "array" "$BODY"

do_request GET "/products/search?q=gadget"
assert_status "GET /products/search?q=gadget" 200 "$STATUS"

section "Normal — Update product"
do_request PUT "/products/$PRODUCT_ID" '{"price":24.99,"stock":80}'
assert_status "PUT /products/:id (price + stock)" 200 "$STATUS"
assert_json_field "updated price" ".price" "24.99" "$BODY"

do_request PUT "/products/$PRODUCT_ID2" '{"name":"Gadget Plus","description":"Upgraded gadget"}'
assert_status "PUT /products/:id (name + description)" 200 "$STATUS"
assert_json_field "updated name" ".name" "Gadget Plus" "$BODY"

section "Normal — Delete product"
do_request DELETE "/products/$PRODUCT_ID3"
assert_status "DELETE /products/:id (exists)" 200 "$STATUS"
assert_json_field "deleted flag" ".deleted" "true" "$BODY"

# Verify it's gone.
do_request GET "/products/$PRODUCT_ID3"
assert_status "GET deleted product returns 404" 404 "$STATUS"

# ── DESTRUCTIVE: Validation errors ──────────────────────────────────────────
section "Destructive — Validation errors"

do_request POST /products '{"description":"missing name and price"}'
assert_status "POST /products (missing required fields) → 422" 422 "$STATUS"

do_request POST /products '{"name":"","price":10}'
assert_status "POST /products (empty name) → 422" 422 "$STATUS"

do_request PUT "/products/$PRODUCT_ID" '{}'
assert_status "PUT /products/:id (empty body) → 422" 422 "$STATUS"

do_request GET "/products/search"
assert_status "GET /products/search (no q param) → 422" 422 "$STATUS"

# ── DESTRUCTIVE: Not found ──────────────────────────────────────────────────
section "Destructive — Not found"

do_request GET "/products/999999"
assert_status "GET /products/:id (nonexistent) → 404" 404 "$STATUS"

do_request PUT "/products/999999" '{"price":1.00}'
assert_status "PUT /products/:id (nonexistent) → 404" 404 "$STATUS"

do_request DELETE "/products/999999"
assert_status "DELETE /products/:id (nonexistent) → 404" 404 "$STATUS"

# ── DESTRUCTIVE: Invalid IDs ────────────────────────────────────────────────
section "Destructive — Invalid IDs"

do_request GET "/products/abc"
assert_status "GET /products/abc → 400" 400 "$STATUS"

do_request GET "/products/0"
assert_status "GET /products/0 → 400" 400 "$STATUS"

do_request GET "/products/-1"
assert_status "GET /products/-1 → 400" 400 "$STATUS"

do_request DELETE "/products/not-a-number"
assert_status "DELETE /products/not-a-number → 400" 400 "$STATUS"

# ── DESTRUCTIVE: Error route demos ──────────────────────────────────────────
section "Destructive — Error routes (Tracelit SDK demo)"

log "Hitting /error/panic — expect 500 + error span in Tracelit"
do_request GET /error/panic || true
assert_status "GET /error/panic → 500" 500 "$STATUS"

log "Hitting /error/notfound"
do_request GET /error/notfound
assert_status "GET /error/notfound → 404" 404 "$STATUS"

log "Hitting /error/db — bad SQL query"
do_request GET /error/db
assert_status "GET /error/db → 500" 500 "$STATUS"
assert_json_field "db error code" ".code" "DB_ERROR" "$BODY"

log "Hitting /error/validation"
do_request GET /error/validation
assert_status "GET /error/validation → 422" 422 "$STATUS"
assert_json_field "validation code" ".code" "VALIDATION_ERROR" "$BODY"

log "Hitting /error/timeout — this will take ~3 s…"
do_request GET /error/timeout
assert_status "GET /error/timeout → 503" 503 "$STATUS"
assert_json_field "timeout code" ".code" "TIMEOUT" "$BODY"

# ── DESTRUCTIVE: 404 for unknown route ──────────────────────────────────────
section "Destructive — Unknown routes"

do_request GET /does-not-exist
assert_status "GET /does-not-exist → 404" 404 "$STATUS"

do_request DELETE /products
assert_status "DELETE /products (no id) → 404" 404 "$STATUS"

# ── Cleanup ─────────────────────────────────────────────────────────────────
section "Cleanup — Delete remaining test products"

do_request DELETE "/products/$PRODUCT_ID"
assert_status "DELETE product $PRODUCT_ID" 200 "$STATUS"

do_request DELETE "/products/$PRODUCT_ID2"
assert_status "DELETE product $PRODUCT_ID2" 200 "$STATUS"

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}════════════════════════════════════${RESET}"
echo -e "${BOLD}Results:${RESET}  ${GREEN}${PASS} passed${RESET}  ${RED}${FAIL} failed${RESET}  ${YELLOW}${SKIP} skipped${RESET}"
echo -e "${BOLD}════════════════════════════════════${RESET}"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi

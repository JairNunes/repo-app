#!/usr/bin/env bash
# E2E smoke test do fluxo completo da Fase 3.
# Pré-requisito: API Gateway URL + admin credentials + customer CPF cadastrado.
#
# Uso:
#   API_BASE=https://abc.execute-api.us-east-1.amazonaws.com/prod \
#   ADMIN_EMAIL=admin@oficina.com \
#   ADMIN_PASSWORD=Oficina@2024 \
#   CUSTOMER_CPF=11144477735 \
#   ./scripts/e2e-smoke.sh

set -e

: "${API_BASE:?API_BASE not set}"
: "${ADMIN_EMAIL:?ADMIN_EMAIL not set}"
: "${ADMIN_PASSWORD:?ADMIN_PASSWORD not set}"
: "${CUSTOMER_CPF:?CUSTOMER_CPF not set}"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

ok() { echo -e "${GREEN}✓${NC} $1"; }
fail() { echo -e "${RED}✗${NC} $1"; exit 1; }
step() { echo ""; echo "==> $1"; }

step "1. Health check"
HEALTH=$(curl -fsS "$API_BASE/health" || fail "health endpoint não respondeu")
echo "$HEALTH" | grep -q '"status":"ok"' && ok "health endpoint retornou ok"

step "2. Login admin (Fase 2 — email/senha)"
ADMIN_TOKEN=$(curl -fsS -X POST "$API_BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" \
  | jq -r '.access_token')
[ -n "$ADMIN_TOKEN" ] && [ "$ADMIN_TOKEN" != "null" ] || fail "admin login não retornou token"
ok "admin JWT emitido (length: ${#ADMIN_TOKEN})"

step "3. Login customer (Fase 3 — Lambda CPF)"
CUSTOMER_TOKEN=$(curl -fsS -X POST "$API_BASE/auth/cpf" \
  -H "Content-Type: application/json" \
  -d "{\"cpf\":\"$CUSTOMER_CPF\"}" \
  | jq -r '.access_token')
[ -n "$CUSTOMER_TOKEN" ] && [ "$CUSTOMER_TOKEN" != "null" ] || fail "lambda auth não retornou token"
ok "customer JWT emitido via Lambda (length: ${#CUSTOMER_TOKEN})"

step "4. CPF inválido retorna 400"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$API_BASE/auth/cpf" \
  -H "Content-Type: application/json" -d '{"cpf":"11111111111"}')
[ "$STATUS" = "400" ] && ok "CPF inválido retornou 400" || fail "esperado 400, recebido $STATUS"

step "5. Listar OS ativas (admin)"
ORDERS=$(curl -fsS "$API_BASE/admin/service-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN")
COUNT=$(echo "$ORDERS" | jq 'length')
ok "$COUNT OS ativas retornadas"

step "6. Correlation ID propagado"
CORR_ID="e2e-test-$(date +%s)"
RESPONSE_CORR=$(curl -sS -X GET "$API_BASE/admin/service-orders" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "X-Correlation-ID: $CORR_ID" \
  -D - -o /dev/null | grep -i "x-correlation-id" | awk '{print $2}' | tr -d '\r')
[ "$RESPONSE_CORR" = "$CORR_ID" ] && ok "X-Correlation-ID propagado corretamente" \
  || fail "X-Correlation-ID não retornou esperado ($CORR_ID, got $RESPONSE_CORR)"

step "7. Customer JWT não acessa rota /admin/*"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$API_BASE/admin/service-orders" \
  -H "Authorization: Bearer $CUSTOMER_TOKEN")
[ "$STATUS" = "401" ] || [ "$STATUS" = "403" ] && ok "customer bloqueado de rota admin ($STATUS)" \
  || fail "esperado 401/403, recebido $STATUS"

echo ""
echo -e "${GREEN}=== TODOS OS TESTES E2E PASSARAM ===${NC}"

# Observabilidade

A observabilidade do projeto roda em New Relic (free tier de 100GB/mês). Esse diretório tem:

- `dashboards/` — JSONs dos 4 dashboards (importáveis pela UI ou por Terraform `newrelic_one_dashboard`).
- `alerts/` — 3 alertas em YAML.
- `nrql/queries.md` — queries soltas pra investigação.
- `k8s-integration.md` — instalação do `nri-bundle`.

## O que tá ligado

**APM agent (Node.js).** Package `newrelic` 11.x. Configuração em `newrelic.js` na raiz da app. Bootstrap via `node -r newrelic dist/src/main` (Dockerfile e script `start:prod`). License key vem da env `NEW_RELIC_LICENSE_KEY`.

**Logs em forwarding.** Habilitado em `newrelic.js` (`application_logging.forwarding.enabled`). Os logs JSON do Winston caem no NR Logs com `correlationId`, `userId`, `userType`, `responseTime`, `statusCode`, `method` e `path` — searchable.

**Custom events.** Emitidos pelo `CustomMetricsService`:

- `ServiceOrderCreated` — no `CreateServiceOrderUseCase`.
- `ServiceOrderStatusChanged` — em cada transição de status.
- `AuthenticationSuccess` / `AuthenticationFailure` — no login admin e no fluxo da Lambda Auth.
- `ServiceOrderError` — no exception filter quando explode algo da OS.

**K8s integration.** `nri-bundle` Helm chart cobre nodes, pods, eventos do cluster e logs dos containers via Fluent Bit. Setup em `k8s-integration.md`.

**Deployment markers.** O job `deploy-eks` do CI/CD bate na API do New Relic ao final do deploy pra marcar a release. Permite correlacionar regressão com deploy específico no APM.

## Dashboards

| Dashboard | Arquivo |
|---|---|
| Volume de OS | `dashboards/01-volume-os.json` |
| Tempo médio por status | `dashboards/02-tempo-por-status.json` |
| Erros e falhas | `dashboards/03-erros-e-falhas.json` |
| Recursos K8s | `dashboards/04-recursos-k8s.json` |

## Alertas

| Alerta | Threshold | Severidade |
|---|---|---|
| Falha em OS | `ServiceOrderError` > 0 em 5 min | Critical |
| Latência alta | p95 > 2s por 5 min | Warning |
| Health check failed | Synthetic monitor `/health` != 200 por 2 min | Critical |

Detalhes em `alerts/`.

## Setup inicial

1. Conta em newrelic.com/signup.
2. License Key (Settings → API keys → Ingest license).
3. User API Key (Settings → API keys → User key).
4. Depois do primeiro deploy: App ID (Explorer → APM → app → URL).
5. GitHub Secrets em cada repo: `NEW_RELIC_LICENSE_KEY`, `NEW_RELIC_API_KEY`, `NEW_RELIC_APP_ID`.
6. Importar os 4 dashboards (Dashboards → Import → JSON).
7. Criar os alertas seguindo `alerts/`.

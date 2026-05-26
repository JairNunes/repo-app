# Observabilidade — New Relic

Toda a observabilidade da Fase 3 está em **New Relic** (free tier 100GB/mês). Esta pasta contém:

- [`dashboards/`](dashboards/) — JSON dos dashboards (importáveis via UI ou Terraform `newrelic_one_dashboard`)
- [`alerts/`](alerts/) — Definição YAML dos 3 alertas obrigatórios
- [`nrql/`](nrql/) — Queries NRQL avulsas para investigação
- [`k8s-integration.md`](k8s-integration.md) — Instalação do `nri-bundle` Helm chart

## Componentes ativos

### 1. APM Agent (Node.js)

- Package: `newrelic` (11.x)
- Configuração: [`newrelic.js`](../../newrelic.js) na raiz do projeto
- Bootstrap: `node -r newrelic dist/src/main` (Dockerfile + `start:prod` script)
- License key via env `NEW_RELIC_LICENSE_KEY` (injetada pelo K8s Secret)

### 2. Logs em Forwarding (application_logging)

Habilitado no `newrelic.js` (`application_logging.forwarding.enabled: true`). Os logs JSON do Winston são enviados automaticamente ao New Relic Logs com:

- `correlationId` → searchable em todas requests
- `userId`, `userType` (admin/customer) → quando autenticado
- `responseTime`, `statusCode`, `method`, `path` → via `HttpLoggerMiddleware`

### 3. Custom Events

Emitidos por [`CustomMetricsService`](../../src/shared/observability/custom-metrics.service.ts):

| Evento | Onde | Atributos |
|---|---|---|
| `ServiceOrderCreated` | `CreateServiceOrderUseCase` | `serviceOrderId`, `customerId`, `status`, `totalCents` |
| `ServiceOrderStatusChanged` | Use-cases de transição | `serviceOrderId`, `fromStatus`, `toStatus`, `durationMinutes?` |
| `AuthenticationSuccess` | `AuthService.login` | `userId`, `type` (admin/customer) |
| `AuthenticationFailure` | `AuthService.login` (catch) | `reason`, `type` |
| `ServiceOrderError` | global error filter | `serviceOrderId?`, `operation`, `error` |

### 4. K8s Integration

Instalada via `nri-bundle` Helm chart (ver [`k8s-integration.md`](k8s-integration.md)). Cobre:

- CPU e memória dos **nodes** (workers EKS)
- CPU e memória dos **pods** (HPA visualizável)
- Eventos do cluster (rollouts, restarts)
- Logs dos containers (stdout/stderr → New Relic Logs)

### 5. Deployment Markers

A pipeline CI/CD (`deploy-eks` job) faz POST para a API do New Relic ao final do deploy:

```
POST https://api.newrelic.com/v2/applications/{NEW_RELIC_APP_ID}/deployments.json
```

Marca a release no APM permitindo correlacionar regressão com deploy específico.

## Dashboards obrigatórios

| Dashboard | Arquivo | NRQL principal |
|---|---|---|
| Volume de OS | [dashboards/01-volume-os.json](dashboards/01-volume-os.json) | `SELECT count(*) FROM ServiceOrderCreated FACET dateOf(timestamp) SINCE 30 days ago` |
| Tempo Médio por Status | [dashboards/02-tempo-por-status.json](dashboards/02-tempo-por-status.json) | `SELECT average(durationMinutes) FROM ServiceOrderStatusChanged FACET fromStatus SINCE 7 days ago` |
| Erros e Falhas | [dashboards/03-erros-e-falhas.json](dashboards/03-erros-e-falhas.json) | `SELECT count(*) FROM Transaction WHERE httpResponseCode >= 500 TIMESERIES SINCE 24 hours ago` |
| Recursos K8s | [dashboards/04-recursos-k8s.json](dashboards/04-recursos-k8s.json) | `SELECT average(cpuUsedCores), average(memoryUsedBytes) FROM K8sPodSample WHERE namespace='auto-repair-shop' TIMESERIES` |

## Alertas obrigatórios

| Alerta | Threshold | Severidade |
|---|---|---|
| Falha em OS | `ServiceOrderError` > 0 em 5 min | **Critical** |
| Latência alta | p95 response time > 2s por 5 min | **Warning** |
| Health check failed | `/health` retorna != 200 por 2 min (Synthetic monitor) | **Critical** |

Definição: [`alerts/`](alerts/).

## Setup inicial

1. Criar conta em [newrelic.com/signup](https://newrelic.com/signup)
2. Pegar `License Key` (Settings → API keys → Ingest license)
3. Pegar `App ID` após primeiro deploy (Explorer → APM → seu app → ID na URL)
4. Pegar `User API Key` (Settings → API keys → User key) → para Terraform e deployment markers
5. Configurar GitHub Secrets:
   - `NEW_RELIC_LICENSE_KEY`
   - `NEW_RELIC_API_KEY` (User key)
   - `NEW_RELIC_APP_ID`
6. Importar dashboards via UI (Dashboards → Import → JSON)
7. Criar alertas (Alerts → Policies → New Policy → seguir [`alerts/`](alerts/))

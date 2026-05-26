# Auto Repair Shop API — Fase 3

Tech Challenge **Fase 3** — Pós Tech FIAP Software Architecture (13SOAT). **Grupo 72 — Jair Nunes.**

API NestJS de gestão de ordens de serviço de uma oficina mecânica, evoluída da Fase 2 para arquitetura **cloud-native AWS**: 4 repositórios separados, infraestrutura como código, Function Serverless para autenticação, banco gerenciado, cluster Kubernetes e observabilidade plena.

## Repositórios da solução

| Repo | Responsabilidade |
|---|---|
| **repo-app** (este) | Aplicação NestJS — domínio, use-cases, controllers, observabilidade |
| [repo-lambda-auth](https://github.com/JairNunes/repo-lambda-auth) | Lambda Auth (CPF→JWT) + Lambda Notify (SNS) + API Gateway |
| [repo-infra-db](https://github.com/JairNunes/repo-infra-db) | Terraform — RDS PostgreSQL gerenciado |
| [repo-infra-k8s](https://github.com/JairNunes/repo-infra-k8s) | Terraform — VPC, EKS, ECR, K8s resources |

## Novidades vs Fase 2

| Área | Fase 2 | Fase 3 |
|---|---|---|
| Auth | Email/senha → JWT | Mantém + aceita JWT customer da Lambda (campo `type` no token) |
| Health check | Probes em `/docs` | `GET /health` com `@nestjs/terminus` (DB + memória + disco) |
| Logging | `console.log` | Winston JSON estruturado + correlation ID por request |
| Observabilidade | — | New Relic APM + custom events + 4 dashboards + 3 alertas |
| Banco | PostgreSQL pod no cluster | RDS PostgreSQL gerenciado (via `repo-infra-db`) |
| Notificação | — | Após transição de status, chama Lambda Notify (HTTP fire-and-forget) → SNS → email |
| Deploy | Artifact local | Push ECR + deploy automático no EKS via GitHub Actions |

## Stack

- **Runtime:** Node.js 20 · NestJS 10 · TypeScript 5
- **Persistência:** Prisma 5.8 · PostgreSQL 16 (RDS)
- **Auth:** JWT (Passport) — admin (email/senha) + customer (CPF via Lambda)
- **Observabilidade:** New Relic APM + `nest-winston` + `@nestjs/terminus`
- **HTTP client:** `@nestjs/axios` (notificações)
- **Containerização:** Docker multi-stage + healthcheck embutido
- **Orquestração:** Kubernetes (EKS) com HPA min 2 / max 10
- **CI/CD:** GitHub Actions — build → test → push ECR → deploy EKS → marker New Relic

## Arquitetura

```
src/
├── domain/                       # Entidades, enums, regras puras
├── application/                  # Use-cases + ports (interfaces)
├── infrastructure/               # Adapters (Prisma repos + config)
├── modules/                      # NestJS modules (controllers + DTOs)
│   ├── auth/                     # Login admin (email/senha)
│   ├── customers/, vehicles/, services/, parts/, service-orders/
│   ├── metrics/                  # Métricas customizadas (Fase 2)
│   └── health/                   # GET /health (Fase 3) — terminus
├── shared/
│   ├── logging/
│   │   ├── correlation-id.ts             # AsyncLocalStorage + middleware
│   │   ├── http-logger.middleware.ts     # Loga toda request com responseTime
│   │   └── winston.config.ts             # JSON em prod, pretty em dev
│   ├── observability/
│   │   └── custom-metrics.service.ts     # Wrapper de newrelic.recordCustomEvent
│   ├── services/
│   │   └── notification-client.ts        # POST → Lambda /notify/status-change
│   ├── guards/
│   │   └── combined-auth.guard.ts        # Aceita JWT admin OU customer
│   ├── http/                              # Filter global de exceções
│   └── validation/                        # Value objects (Document, Plate)
```

## Endpoints

### Health & docs
- `GET /health` — terminus check (DB/memória/disco)
- `GET /docs` — Swagger

### Auth
- `POST /auth/login` — login admin → JWT com `type: "admin"`
- `POST /auth/cpf` — **rodando na Lambda** (`repo-lambda-auth`) → JWT com `type: "customer"`

### Admin (requer JWT admin)
- `GET/POST /admin/customers`, `/admin/vehicles`, `/admin/services`, `/admin/parts`
- `POST /admin/service-orders` — criar OS (dispara custom event `ServiceOrderCreated` no New Relic)
- `GET /admin/service-orders` — listar ativas
- `POST /admin/service-orders/:id/start-diagnosis` — Received → InDiagnosis
- `POST /admin/service-orders/:id/send-for-approval` — InDiagnosis → AwaitingApproval
- `POST /admin/service-orders/:id/approve` — AwaitingApproval → InExecution
- `POST /admin/service-orders/:id/reject` — AwaitingApproval → InDiagnosis
- `POST /admin/service-orders/:id/finalize` — InExecution → Finalized + notifica cliente
- `POST /admin/service-orders/:id/deliver` — Finalized → Delivered + notifica cliente

### Públicas
- `GET /service-orders/:id/status?customerDocument=CPF`
- `POST /service-orders/:id/external-update`

## Correlation ID

Toda request passa pelo `CorrelationIdMiddleware`:

1. Lê header `X-Correlation-ID` (se vier) ou gera UUIDv4
2. Armazena em `AsyncLocalStorage`
3. Devolve no response header `X-Correlation-ID`
4. Todo log Winston e custom event do New Relic carregam o `correlationId` automaticamente

## Como rodar local

```bash
cp .env.example .env
# preencher DATABASE_URL, JWT_SECRET, etc.

npm install
npx prisma migrate deploy
npm run start:dev
```

Acesse [http://localhost:3000/docs](http://localhost:3000/docs).

## Testes

```bash
npm test
npm run test:cov
```

## Docker

```bash
docker build -t oficina-mecanica-api:latest .
docker run -p 3000:3000 --env-file .env oficina-mecanica-api:latest
```

## Deploy

Push em `main` → GitHub Actions:

1. **build-and-test** — npm ci, prisma migrate, lint, test, build
2. **docker-build-and-push** — build, tag (`$SHA` + `latest`), push para ECR
3. **deploy-eks** — `aws eks update-kubeconfig` → `envsubst` nos manifests → `kubectl apply` → `kubectl rollout status` → marker no New Relic

**Secrets necessários no repo:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEW_RELIC_API_KEY`, `NEW_RELIC_APP_ID`.

## Documentação técnica

Toda a documentação Fase 3 está em [`docs/`](docs/):

- [`docs/architecture/components.md`](docs/architecture/components.md) — Diagrama de Componentes
- [`docs/architecture/sequence-auth-cpf.md`](docs/architecture/sequence-auth-cpf.md) — Sequência: Autenticação CPF
- [`docs/architecture/sequence-create-os.md`](docs/architecture/sequence-create-os.md) — Sequência: Abertura de OS
- [`docs/architecture/er-diagram.md`](docs/architecture/er-diagram.md) — Diagrama ER com justificativa
- [`docs/rfcs/`](docs/rfcs/) — RFC-001 Cloud · RFC-002 Auth · RFC-003 Observabilidade
- [`docs/adrs/`](docs/adrs/) — ADR-001 Comunicação · ADR-002 HPA · ADR-003 API Gateway
- [`docs/observability/`](docs/observability/) — Dashboards (NRQL) e alertas New Relic

## Postman

Coleção em [`postman/`](postman/) — importar no Postman, configurar variável `baseUrl`.

## Credenciais default (dev)

- **Admin:** `admin@oficina.com` / `Oficina@2024`

## Branch protection

`main`: PR obrigatório, sem commits diretos, status checks `build-and-test`.

## Vídeo

Link: a definir.

## Colaborador FIAP

Usuário `soat-architecture` adicionado como collaborator nos 4 repos.

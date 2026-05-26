# Auto Repair Shop API — Fase 3

Tech Challenge Fase 3 — Pós Tech FIAP Software Architecture (13SOAT). Grupo 72 — Jair Nunes.

API NestJS de gestão de ordens de serviço de uma oficina mecânica. A Fase 3 transforma o monorepo da Fase 2 numa solução cloud-native AWS com 4 repos: aplicação, lambdas serverless, infra do banco e infra do cluster.

## Repos da solução

- **repo-app** (esse) — aplicação NestJS, domínio, use-cases, controllers, observabilidade, docs.
- **[repo-lambda-auth](https://github.com/JairNunes/repo-lambda-auth)** — Lambda Auth (CPF → JWT) + Lambda Notify (SNS) + API Gateway via SAM.
- **[repo-infra-db](https://github.com/JairNunes/repo-infra-db)** — Terraform do RDS PostgreSQL.
- **[repo-infra-k8s](https://github.com/JairNunes/repo-infra-k8s)** — Terraform de VPC, EKS, ECR e recursos K8s.

## O que mudou em relação à Fase 2

- Auth admin (email/senha) continua, mas o JWT carrega `type: "admin"`. Cliente pode autenticar via CPF na Lambda e recebe JWT com `type: "customer"`. Um guard combinado diferencia os dois.
- `GET /health` substitui o `/docs` como readiness/liveness probe — usa `@nestjs/terminus` com check de DB, memória e disco.
- Logs JSON estruturados via Winston, com `correlationId` propagado por `AsyncLocalStorage` em toda a request.
- Após `finalize` e `deliver`, a app chama a Lambda Notify (fire-and-forget) que publica no SNS e o cliente recebe email.
- O banco saiu do cluster (Fase 2 tinha postgres como pod) e virou RDS gerenciado.
- New Relic APM integrado com custom events em criação/transição de OS e auth, 4 dashboards e 3 alertas.
- CI/CD agora faz push pro ECR e deploy automático no EKS.

## Stack

- Node.js 20, NestJS 10, TypeScript 5
- Prisma 5.8, PostgreSQL 16 (RDS)
- JWT (Passport) admin + customer
- `@nestjs/terminus`, `nest-winston`, `@nestjs/axios`, `newrelic`
- Docker multi-stage com HEALTHCHECK
- Kubernetes (EKS) com HPA
- GitHub Actions

## Estrutura

```
src/
├── domain/                     entidades, enums, regras
├── application/                use-cases, ports
├── infrastructure/             adapters Prisma, config
├── modules/
│   ├── auth/                   login admin
│   ├── customers/ vehicles/ services/ parts/ service-orders/
│   ├── metrics/                métricas customizadas (Fase 2)
│   └── health/                 GET /health
└── shared/
    ├── logging/                correlation ID, Winston config, http logger
    ├── observability/          custom metrics (New Relic)
    ├── services/               notification client (Lambda Notify)
    ├── guards/                 combined auth guard
    ├── http/                   filter global
    └── validation/             value objects
```

## Endpoints

Login admin: `POST /auth/login`.
Login customer: `POST /auth/cpf` (rodando na Lambda).

Admin (JWT admin):
- `POST /admin/service-orders`
- `GET /admin/service-orders`
- `POST /admin/service-orders/:id/start-diagnosis`
- `POST /admin/service-orders/:id/send-for-approval`
- `POST /admin/service-orders/:id/approve`
- `POST /admin/service-orders/:id/reject`
- `POST /admin/service-orders/:id/finalize` (notifica cliente)
- `POST /admin/service-orders/:id/deliver` (notifica cliente)
- CRUDs: `/admin/customers`, `/admin/vehicles`, `/admin/services`, `/admin/parts`

Públicas:
- `GET /service-orders/:id/status?customerDocument=CPF`
- `POST /service-orders/:id/external-update`

Operacional:
- `GET /health` — terminus
- `GET /docs` — Swagger

## Correlation ID

Toda request passa pelo `CorrelationIdMiddleware`: lê o header `X-Correlation-ID` (se vier) ou gera UUID v4, guarda em `AsyncLocalStorage` e devolve no response header. Winston e custom events do New Relic puxam automaticamente — não precisa passar como argumento em lugar nenhum.

## Rodando local

```bash
cp .env.example .env
# preencher DATABASE_URL, JWT_SECRET etc.

npm install
npx prisma migrate deploy
npm run start:dev
```

Acesse http://localhost:3000/docs.

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

Push em `main` dispara o CI/CD:

1. `build-and-test` — `npm ci`, prisma migrate, lint, test, build.
2. `docker-build-and-push` — build da imagem, tag (`$SHA` e `latest`), push pro ECR.
3. `deploy-eks` — `aws eks update-kubeconfig`, `envsubst` nos manifests, `kubectl apply`, `kubectl rollout status`, deployment marker no New Relic.

Secrets necessários: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `NEW_RELIC_API_KEY`, `NEW_RELIC_APP_ID`.

## Documentação

Toda em `docs/`:

- Arquitetura: `docs/architecture/` (componentes, sequências, ER)
- RFCs: `docs/rfcs/` (cloud, auth, observabilidade)
- ADRs: `docs/adrs/` (comunicação, HPA, API Gateway)
- Observabilidade: `docs/observability/` (dashboards, alertas, K8s integration, queries)

## Postman

Coleção em `postman/`. Importar e configurar a variável `baseUrl`.

## Credenciais default (dev)

Admin: `admin@oficina.com` / `Oficina@2024`.

## Smoke test

```bash
API_BASE=https://<api-gw>.execute-api.us-east-1.amazonaws.com/prod \
ADMIN_EMAIL=admin@oficina.com \
ADMIN_PASSWORD=Oficina@2024 \
CUSTOMER_CPF=<cpf-cadastrado> \
./scripts/e2e-smoke.sh
```

## Branch protection

`main` protegida — PR obrigatório, sem commit direto.

## Colaborador FIAP

Usuário `soat-architecture` convidado em todos os 4 repos.

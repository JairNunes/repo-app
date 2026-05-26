# Documentação técnica — Fase 3

Índice de toda a documentação técnica da Fase 3 do Tech Challenge FIAP (Grupo 72 — Jair Nunes).

## Arquitetura

- [Diagrama de Componentes](architecture/components.md) — visão completa do sistema
- [Diagrama de Sequência — Auth CPF](architecture/sequence-auth-cpf.md)
- [Diagrama de Sequência — Abertura de OS](architecture/sequence-create-os.md)
- [Diagrama ER + Justificativa](architecture/er-diagram.md)

## RFCs (Request for Comments — decisões estratégicas)

- [RFC-001 — Escolha do provedor cloud (AWS)](rfcs/RFC-001-escolha-cloud.md)
- [RFC-002 — Estratégia de autenticação por CPF](rfcs/RFC-002-estrategia-auth.md)
- [RFC-003 — Escolha da ferramenta de observabilidade (New Relic)](rfcs/RFC-003-observabilidade.md)

## ADRs (Architecture Decision Records — decisões arquiteturais)

- [ADR-001 — Comunicação HTTP síncrona](adrs/ADR-001-comunicacao-http-sincrona.md)
- [ADR-002 — HPA com CPU + memória, min 2 / max 10](adrs/ADR-002-hpa-cpu-memoria.md)
- [ADR-003 — API Gateway único como ponto de entrada](adrs/ADR-003-api-gateway-unico.md)

## Observabilidade

- [Visão geral New Relic](observability/README.md)
- [Dashboards](observability/dashboards/) — 4 JSONs importáveis
- [Alertas](observability/alerts/) — 3 YAMLs
- [K8s Integration](observability/k8s-integration.md) — `nri-bundle` setup
- [NRQL Queries](observability/nrql/queries.md) — investigação ad-hoc

## Quick links

- **Swagger** local: http://localhost:3000/docs (após `npm run start:dev`)
- **Postman collection:** [`postman/`](../postman/)
- **OpenAPI da Lambda:** [`docs/openapi.yaml`](https://github.com/JairNunes/repo-lambda-auth/blob/main/docs/openapi.yaml) (no repo-lambda-auth)
- **Health check:** `GET /health`

## Convenções

### Formato RFC

Inspirado no [MADR (Markdown Any Decision Records)](https://adr.github.io/madr/) com adaptações:

- **Contexto:** o problema que motiva a decisão
- **Alternativas:** opções analisadas (com prós e contras)
- **Decisão:** a escolha feita
- **Trade-offs:** o que se perde
- **Consequências:** impacto no resto do sistema
- **Quando reabrir:** sinais que sugerem rediscussão

### Formato ADR

Mais conciso que RFC. Mesma estrutura, foco no que mudou estruturalmente.

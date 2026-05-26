# docs/

Documentação técnica da Fase 3.

**Arquitetura** (`architecture/`):
- [Diagrama de componentes](architecture/components.md)
- [Sequência — auth CPF](architecture/sequence-auth-cpf.md)
- [Sequência — abertura de OS](architecture/sequence-create-os.md)
- [Diagrama ER](architecture/er-diagram.md)

**RFCs** (decisões estratégicas, `rfcs/`):
- [RFC-001 — Escolha da nuvem](rfcs/RFC-001-escolha-cloud.md)
- [RFC-002 — Estratégia de auth por CPF](rfcs/RFC-002-estrategia-auth.md)
- [RFC-003 — Ferramenta de observabilidade](rfcs/RFC-003-observabilidade.md)

**ADRs** (decisões arquiteturais, `adrs/`):
- [ADR-001 — Comunicação HTTP síncrona](adrs/ADR-001-comunicacao-http-sincrona.md)
- [ADR-002 — HPA com CPU e memória](adrs/ADR-002-hpa-cpu-memoria.md)
- [ADR-003 — API Gateway único](adrs/ADR-003-api-gateway-unico.md)

**Observabilidade** (`observability/`):
- [Visão geral](observability/README.md)
- [Dashboards](observability/dashboards/) — 4 JSONs
- [Alertas](observability/alerts/) — 3 YAMLs
- [Integração K8s](observability/k8s-integration.md)
- [Queries NRQL](observability/nrql/queries.md)

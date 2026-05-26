# RFC-003 — Ferramenta de observabilidade

Status: aceita
Data: 05/2026
Autor: Jair Nunes

## Contexto

O PDF dá duas opções: Datadog ou New Relic. Tem que escolher uma e cobrir APM, logs estruturados, dashboards (volume de OS, tempo médio por status, erros), alertas e monitoramento de recursos do K8s.

## Opções consideradas

**New Relic.** Free tier de 100GB/mês de ingestão e 1 usuário grátis. APM completo no free, logs com forwarding nativo do `nest-winston`. K8s integration via Helm chart `nri-bundle`. Custom events com `recordCustomEvent` queryável em NRQL. Dashboards e alertas sem limite no free.

**Datadog.** Free tier limitado a 1 host monitorado e 5 dashboards. APM só após trial de 14 dias. Logs com 5 dias de retenção no free. UI mais polida e features enterprise mais maduras (incident management, security monitoring).

## Decisão

New Relic. Datadog limita a 5 dashboards e a Fase 3 já exige 4 (volume, tempo por status, erros, recursos K8s) — não sobra espaço pra dashboards de investigação. APM no free e ingest de 100GB cobre com folga o tráfego que esse projeto vai gerar em apresentação.

NRQL parece SQL e é mais fácil de pensar quando você tá montando dashboard ad-hoc. O `nri-bundle` já vem com Prometheus agent, Fluent Bit e kube-state-metrics em um único chart, então não precisa instalar 4 coisas separadas no cluster.

## Consequências

A app instala `newrelic` e `nest-winston`. O `newrelic.js` na raiz liga `application_logging.forwarding` pra mandar os logs do Winston pro NR Logs. Bootstrap vira `node -r newrelic dist/src/main`. O `CustomMetricsService` em `src/shared/observability/` envolve o agent e expõe métodos por tipo de evento (`ServiceOrderCreated`, `ServiceOrderStatusChanged`, `AuthenticationSuccess` etc.).

O cluster EKS instala o `nri-bundle` via Helm — instruções em `docs/observability/k8s-integration.md`. Os 4 dashboards ficam versionados como JSON em `docs/observability/dashboards/` (importáveis via UI ou Terraform). Os 3 alertas em YAML em `docs/observability/alerts/`. License key, user API key e app id entram nos GitHub Secrets.

Migrar de New Relic pra Datadog no futuro é trabalhoso porque NRQL não é DQL. Manter os dashboards como JSON ajuda a documentar a intenção, mesmo que não dê pra fazer port-over direto.

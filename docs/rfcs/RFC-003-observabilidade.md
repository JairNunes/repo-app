# RFC-003 — Escolha da ferramenta de observabilidade

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Autor** | Jair Nunes |

## Contexto

O PDF da Fase 3 exige "ferramenta como **Datadog** ou **New Relic**" para:

- APM (Application Performance Monitoring)
- Logs estruturados
- Dashboards customizados (volume de OS, tempo por status, erros)
- Alertas
- Monitoramento de recursos K8s (CPU/memória)

Precisamos escolher **uma** ferramenta (não as duas — anti-instrução do CONTEXT-MAP).

## Alternativas

### A. New Relic

| Aspecto | Detalhe |
|---|---|
| Free tier | **100GB/mês** ingestão + 1 user gratuito |
| APM | Node.js agent (`newrelic` npm) — full features no free |
| Logs | Application logging forwarding nativo |
| K8s integration | `nri-bundle` Helm chart |
| Custom Events | `recordCustomEvent(name, attrs)` — NRQL nativo |
| Dashboards | Sem limite no free tier |
| Alertas | Sem limite no free tier |
| API | Terraform provider oficial |
| Idade | 2008 |

### B. Datadog

| Aspecto | Detalhe |
|---|---|
| Free tier | **1 host** monitorado + 5 dashboards |
| APM | Trial 14 dias depois pago |
| Logs | 5 days retention no free |
| K8s integration | Helm chart `datadog/datadog` |
| Custom Metrics | API limitada no free |
| Dashboards | 5 dashboards no free |
| API | Terraform provider oficial |
| Idade | 2010 |

## Decisão

**Escolhido: New Relic.**

### Motivos

1. **Free tier supera necessidades acadêmicas com folga:** 100GB/mês ingestão (~30x mais do que o app vai gerar em apresentação acadêmica). Datadog limita a 1 host e 5 dashboards — incompatível com 4 dashboards obrigatórios + capacity de adicionar mais.
2. **APM e Logs no free tier:** New Relic libera APM completo no free; Datadog libera apenas após período trial.
3. **NRQL é mais expressivo que Datadog Query Language** para dashboards customizados ad-hoc. Sintaxe SQL-like é familiar.
4. **K8s integration via Helm é equivalente nos dois**, mas o `nri-bundle` da New Relic já vem com Prometheus agent + Fluent Bit + kube-state-metrics em um único chart.

## Trade-offs

### Curva de aprendizado

Datadog tem UX mais polido e dashboards visualmente mais profissionais. New Relic UI 2 (One) é boa, mas mais densa. Aceitável para contexto técnico.

### Ecossistema enterprise

Datadog tem mais features enterprise (incident management nativo, security monitoring, RUM mais maduro). Para projeto acadêmico, irrelevante.

### Lock-in

Migrar dashboards de New Relic para Datadog (ou vice-versa) é trabalhoso — NRQL ≠ DQL. Mitigação: dashboards versionados como JSON em [`docs/observability/dashboards/`](../observability/dashboards/).

## Consequências

- App NestJS instala `newrelic` package + `nest-winston` para logs JSON
- `newrelic.js` na raiz do projeto com `application_logging.forwarding.enabled: true`
- Bootstrap usa `node -r newrelic dist/src/main` (Dockerfile + start:prod)
- Cluster EKS instala `nri-bundle` Helm chart (ver [`k8s-integration.md`](../observability/k8s-integration.md))
- 4 dashboards versionados em JSON; podem ser importados via UI ou Terraform
- 3 alertas obrigatórios + 1 deployment marker via API
- License key + API key + App ID em GitHub Secrets

## Referências

- [New Relic Free Tier](https://newrelic.com/pricing)
- [Datadog Pricing](https://www.datadoghq.com/pricing/)
- [NRQL Reference](https://docs.newrelic.com/docs/nrql/)
- [nri-bundle Helm chart](https://github.com/newrelic/helm-charts/tree/master/charts/nri-bundle)

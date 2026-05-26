# NRQL Queries — investigação ad-hoc

Coleção de queries úteis para debug e análises pontuais. Cole no New Relic → Query Builder.

## Volume

```sql
-- OS criadas hoje vs ontem
SELECT count(*) FROM ServiceOrderCreated SINCE today COMPARE WITH 1 day ago

-- Pico de OS na última semana
SELECT max(rate(count(*), 1 hour)) FROM ServiceOrderCreated TIMESERIES 1 hour SINCE 7 days ago

-- Distribuição por hora do dia
SELECT count(*) FROM ServiceOrderCreated FACET hourOf(timestamp) SINCE 30 days ago
```

## Performance

```sql
-- p50, p95, p99 por endpoint
SELECT percentile(duration, 50, 95, 99) FROM Transaction FACET name SINCE 1 hour ago

-- Top 10 endpoints mais lentos
SELECT average(duration) FROM Transaction FACET name SINCE 24 hours ago LIMIT 10

-- Cold start de Lambda (se tiver)
SELECT count(*), average(duration) FROM AwsLambdaInvocation WHERE coldStart = true SINCE 24 hours ago
```

## Auth

```sql
-- Taxa de falha de auth
SELECT count(*) FROM AuthenticationFailure FACET reason SINCE 24 hours ago

-- CPF vs Email login
SELECT count(*) FROM AuthenticationSuccess FACET type SINCE 7 days ago
```

## Errors

```sql
-- Top errors por correlationId
SELECT uniques(correlationId), latest(error.message) FROM TransactionError SINCE 1 hour ago LIMIT 50

-- Erros agrupados por endpoint
SELECT count(*) FROM TransactionError FACET name SINCE 24 hours ago
```

## Database

```sql
-- Queries mais lentas
SELECT average(duration) FROM Datastore FACET datastore.operation SINCE 1 hour ago LIMIT 20

-- Throughput por tabela
SELECT count(*) FROM Datastore FACET datastore.target SINCE 1 hour ago
```

## K8s

```sql
-- Pods restartando
SELECT latest(restartCount) FROM K8sContainerSample WHERE namespace='auto-repair-shop' FACET containerName SINCE 30 minutes ago

-- HPA decisões
SELECT max(numReplicas), min(numReplicas) FROM K8sHpaSample WHERE namespace='auto-repair-shop' SINCE 6 hours ago

-- OOMKilled events
SELECT * FROM K8sEvent WHERE reason='OOMKilling' SINCE 24 hours ago
```

## Correlação por correlationId

```sql
-- Substituir o valor abaixo pelo correlationId real
SELECT * FROM Log, Transaction, ServiceOrderCreated, ServiceOrderStatusChanged
WHERE correlationId = '00000000-0000-0000-0000-000000000000'
SINCE 24 hours ago
```

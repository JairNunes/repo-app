# New Relic Kubernetes Integration

Instala o `nri-bundle` Helm chart no cluster EKS para coletar métricas de CPU/memória de nodes e pods, eventos do cluster, e logs dos containers.

## Pré-requisitos

- Cluster EKS rodando (do [`repo-infra-k8s`](https://github.com/JairNunes/repo-infra-k8s))
- `kubectl` configurado (`aws eks update-kubeconfig --name oficina-mecanica-eks`)
- `helm` 3.x instalado
- Conta New Relic com `License Key` (ingest)

## Instalação

```bash
# 1. Add Helm repo
helm repo add newrelic https://helm-charts.newrelic.com
helm repo update

# 2. Criar namespace
kubectl create namespace newrelic

# 3. Instalar o bundle
helm install newrelic-bundle newrelic/nri-bundle \
  --namespace newrelic \
  --set global.licenseKey=$NEW_RELIC_LICENSE_KEY \
  --set global.cluster=oficina-mecanica-eks \
  --set newrelic-infrastructure.privileged=true \
  --set ksm.enabled=true \
  --set kubeEvents.enabled=true \
  --set newrelic-prometheus-agent.enabled=true \
  --set logging.enabled=true \
  --set newrelic-logging.lowDataMode=true

# 4. Verificar pods
kubectl get pods -n newrelic
```

## O que é coletado

| Componente | Métricas |
|---|---|
| `newrelic-infrastructure` | Métricas dos nodes (CPU, memória, disco, network) |
| `nri-kube-events` | Eventos do cluster (rollouts, restarts, OOMKilled) |
| `nri-metadata-injection` | Labels nos logs (namespace, podName, containerName) |
| `kube-state-metrics` (ksm) | Métricas de objetos K8s (deployments, replicas, HPA) |
| `newrelic-prometheus-agent` | Métricas Prometheus exportadas no cluster |
| `newrelic-logging` (Fluent Bit) | Stdout/stderr dos containers → NR Logs |

## Verificação no New Relic

1. **Explorer → Infrastructure → Kubernetes:** o cluster `oficina-mecanica-eks` deve aparecer
2. **Drill down → Namespace `auto-repair-shop`:** pods, deployments, services visíveis
3. **NRQL test:**
   ```sql
   SELECT count(*) FROM K8sPodSample WHERE clusterName = 'oficina-mecanica-eks' SINCE 5 minutes ago
   ```
   Deve retornar > 0

## Dashboard "Recursos K8s"

Importar [`dashboards/04-recursos-k8s.json`](dashboards/04-recursos-k8s.json) via UI. Cobre:

- CPU/memória por pod no namespace `auto-repair-shop`
- CPU/memória dos worker nodes
- Réplicas atuais (visualiza HPA em ação)

## Desinstalação

```bash
helm uninstall newrelic-bundle -n newrelic
kubectl delete namespace newrelic
```

## Custos

`nri-bundle` envia em torno de 1-3GB/dia para um cluster acadêmico. Está dentro do free tier (100GB/mês).

Para economizar mais:

- `newrelic-prometheus-agent.enabled=false` (se não usar Prometheus)
- `newrelic-logging.lowDataMode=true` (já habilitado acima)
- `newrelic-pixie.enabled=false` (Pixie usa muito dado, default já é off)

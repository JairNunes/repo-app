# ADR-002 — HPA com CPU e memória, min 2 / max 10

Status: aceita
Data: 05/2026

## Contexto

O cluster EKS precisa de HPA pra atender o requisito do PDF. As opções viáveis eram HPA com 1 métrica só (CPU, padrão da Fase 2), HPA com 2 métricas (CPU + memória), VPA (que ajusta tamanho do pod, não quantidade — não substitui HPA), ou KEDA pra escalar por evento (não se aplica, não temos fila).

## Decisão

HPA v2 com CPU 70% e memória 80%, replicas entre 2 e 10. Scale up agressivo (dobra réplicas em 30s, sem stabilization window), scale down conservador (espera 5 min antes de reduzir e cai 50% por minuto).

`minReplicas: 2` garante HA (um pod down não derruba o serviço, rolling update sem downtime). `maxReplicas: 10` limita custo em caso de runaway scaling — 10 pods × 256Mi requests cabe em 2 nodes t3.medium. CPU 70% dá margem pra absorver pico antes de escalar; 80% de memória porque memória escala "tudo ou nada" (passou do limit, é OOMKilled).

Por que CPU sozinho não basta: o agent do New Relic + Winston buffer têm pegada relevante de memória (~80Mi base). Cenário real onde isso importa — se o forwarding de logs encher o buffer, memória sobe sem CPU acompanhar, e o pod morre por OOM antes do HPA reagir.

## Consequências

Custo previsível: sempre 2 pods rodando como linha de base. Resiliente a pico repentino — dobra réplicas em 30s. Resiliente a memory leak — escala antes do OOMKill. O dashboard "Recursos K8s" no New Relic mostra `numReplicas` ao longo do tempo, então dá pra ver o HPA agindo na prática.

Pra validar localmente:
```bash
kubectl get hpa -n auto-repair-shop
kubectl run -i --tty load --image=busybox /bin/sh
# while true; do wget -q -O- http://auto-repair-shop-api/admin/service-orders/all; done
```

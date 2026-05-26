# ADR-002 — HPA com CPU e memória, min 2 / max 10

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Decisor** | Jair Nunes |

## Contexto

O cluster EKS precisa escalar a aplicação NestJS conforme a demanda. Opções:

- **Sem HPA:** número fixo de réplicas. Simples mas não atende ao requisito do PDF (HPA mandatório).
- **HPA com 1 métrica (CPU):** padrão da Fase 2, simples mas pode ignorar pressure de memória.
- **HPA com 2 métricas (CPU + memória):** padrão Fase 3.
- **VPA (Vertical Pod Autoscaler):** redimensiona o tamanho do pod, não a quantidade. Não substitui HPA, mas pode complementar.
- **KEDA com event source:** escalar baseado em eventos (ex: tamanho da fila). Não se aplica — não temos fila.

## Decisão

**HPA v2 com CPU 70% e memória 80%, min 2 / max 10 réplicas.**

Comportamento de scale:

```yaml
behavior:
  scaleUp:
    stabilizationWindowSeconds: 0      # scale up imediato
    policies:
    - type: Percent
      value: 100
      periodSeconds: 30                # dobra réplicas a cada 30s
  scaleDown:
    stabilizationWindowSeconds: 300    # espera 5 min antes de reduzir
    policies:
    - type: Percent
      value: 50
      periodSeconds: 60                # reduz 50% por minuto
```

## Justificativa dos valores

### `minReplicas: 2`
- Garante alta disponibilidade (1 pod down não derruba o serviço)
- Permite rolling update sem downtime
- Custo extra de 1 pod sempre rodando é justificável

### `maxReplicas: 10`
- Limita custo em caso de runaway scaling
- 10 pods × 256Mi requests = 2.5Gi memória total — cabe em 2× `t3.medium`
- Realisticamente, tráfego acadêmico nunca vai exigir mais

### `CPU 70%`
- Alvo conservador, dá margem para pico antes do scale
- 70% × 200m requests = 140m de uso médio antes de escalar
- Coerente com [Kubernetes docs default](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/) recomendado (50-80%)

### `Memória 80%`
- Memória escala "tudo ou nada" — passou de 512Mi limit, é OOMKilled
- 80% × 256Mi requests = 204Mi antes de escalar
- New Relic agent + Winston têm pegada de memória relevante (~80Mi base)

### Scale up agressivo, scale down conservador
- **Scale up imediato:** picos de tráfego não podem aguardar warm up
- **Scale down 5 min de stabilization:** evita "ping pong" — descer rápido demais causa flapping quando o tráfego oscila

## Alternativas consideradas

### A. Só CPU (Fase 2)
- Mais simples
- ❌ Ignora pressão de memória; New Relic agent + Winston podem inchar a memória sem subir CPU. Pod morre por OOMKill antes do HPA escalar.

### B. Custom metric (req/s do New Relic via OpenMetrics adapter)
- Mais "negócio" — escalar por throughput real
- ❌ Complexidade extra (instalar `prometheus-adapter`, expor métrica externa)
- ❌ Free tier do New Relic não expõe metric API direto pro HPA

### C. KEDA
- Para event-driven scaling (filas, mensagens)
- ❌ Não temos filas no projeto

## Consequências

- **Custo previsível:** sempre rodam pelo menos 2 pods (~US$60/mês de t3.medium dividido)
- **Resiliente a pico repentino:** dobra réplicas em 30s
- **Resiliente a memory leak:** se Winston buffer de log explodir, HPA escala antes do OOMKill
- **Observabilidade:** New Relic K8s integration mostra `numReplicas` ao longo do tempo no dashboard "Recursos K8s"

## Verificação

```bash
kubectl get hpa -n auto-repair-shop
kubectl describe hpa auto-repair-shop-api-hpa -n auto-repair-shop

# load test pra ver HPA agindo
kubectl run -i --tty load-generator --image=busybox /bin/sh
# dentro do pod:
# while true; do wget -q -O- http://auto-repair-shop-api/admin/service-orders/all; done
```

## Referências

- [Kubernetes HPA Walkthrough](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/)
- [HPA v2 behavior field](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#configurable-scaling-behavior)

# ADR-001 — Comunicação entre serviços via HTTP síncrono

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Decisor** | Jair Nunes |

## Contexto

A arquitetura tem 3 pontos de comunicação inter-serviços:

1. **Cliente → API Gateway:** sempre HTTPS (não tem alternativa)
2. **API Gateway → Lambda Auth / Lambda Notify:** integração nativa AWS (HTTP)
3. **API Gateway → EKS NLB → Pods:** HTTP proxy
4. **App NestJS → Lambda Notify (notificação de status):** decisão aberta — fila? evento? HTTP?

A escolha em (4) tem peso porque define se o sistema é puramente síncrono ou tem eventos assíncronos.

## Decisão

**Comunicação síncrona via HTTP** em todos os pontos. Sem filas (SQS), sem broker de eventos (EventBridge, SNS direto no app).

A notificação de status (após `finalize`, `deliver`) é feita via **HTTP POST fire-and-forget**:

```typescript
this.http.post(this.endpoint, payload, { headers })
  .pipe(timeout(3000), catchError(err => { /* log warn */ return of(null); }))
```

Sem `await` na response. App principal continua o fluxo independente do resultado.

## Alternativas consideradas

### A. SNS direto do app

App publicaria mensagem no SNS Topic (mesmo Topic que a Lambda Notify usa). Elimina o roundtrip pela Lambda.

- ❌ Cliente paga a complexidade do IAM para publicar no SNS
- ❌ Mensagem teria que ser formatada no app (perdemos a coesão "Lambda decide formato de email")
- ✅ Mais resiliente — SNS tem retry automático

Rejeitada porque o PDF exige "Lambda de notificação". Removê-la não atende ao escopo.

### B. SQS entre app e Lambda

App publica em SQS, Lambda Notify lê e publica no SNS. Garante delivery mesmo se Lambda estiver fora.

- ✅ Robustez
- ❌ Complexidade extra para escopo acadêmico (cold start aceitável, fila não justifica)

Rejeitada por simplicidade.

### C. EventBridge

App emite evento, EventBridge roteia. Permite múltiplos consumidores no futuro.

- ✅ Flexibilidade
- ❌ Mais um componente AWS sem necessidade clara

Rejeitada por YAGNI.

## Consequências

### Positivas

- **Simplicidade:** ler o código revela o fluxo sem precisar olhar configs de fila/event bus.
- **Debug fácil:** correlation ID propaga via header HTTP; basta filtrar no New Relic Logs por `correlationId` para ver request + chamada da Lambda no mesmo trace.
- **Custo zero adicional** (sem SQS, sem EventBridge).

### Negativas

- **Falhas silenciosas:** se a Lambda Notify estiver fora, o cliente não recebe email mas a OS é marcada como Finalized normalmente. Mitigação: log warning + métrica `ServiceOrderError` no New Relic.
- **Sem retry automático:** se a Lambda voltar, a notificação perdida não é refeita. Aceitável para o domínio (notificação de mudança de status, não cobrança).
- **Acoplamento direto:** mudar URL da Lambda exige atualizar ConfigMap do K8s. Mitigação: env var, fácil de rotacionar.

## Quando reabrir esta decisão

- Volume de OS passar de 1.000/dia
- Notificações perdidas virarem reclamação dos clientes
- Adicionar mais consumidores de eventos (analytics, CRM)

## Referências

- [Microservices Patterns — HTTP vs Async](https://microservices.io/patterns/communication-style/messaging.html)
- ADR-003 (API Gateway) — relacionada

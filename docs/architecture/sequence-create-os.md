# Diagrama de Sequência — Abertura de Ordem de Serviço

Fluxo completo do `POST /admin/service-orders`. Cobre criação + métricas + log estruturado.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant GW as API Gateway
    participant App as NestJS Pod (EKS)
    participant Mid as CorrelationIdMiddleware
    participant Guard as CombinedAuthGuard
    participant UC as CreateServiceOrderUseCase
    participant DB as RDS PostgreSQL
    participant NR as New Relic
    participant W as Winston Logger

    A->>GW: POST /admin/service-orders<br/>Authorization: Bearer eyJ...<br/>X-Correlation-ID: opcional
    GW->>App: HTTP proxy via NLB

    App->>Mid: middleware chain
    Mid->>Mid: lê header X-Correlation-ID<br/>ou gera UUID v4
    Mid->>Mid: AsyncLocalStorage.run({ correlationId })
    Mid->>App: setHeader response

    App->>Guard: canActivate(context)
    Guard->>Guard: validateJWT(token)<br/>extrair {sub, type}
    Guard->>Guard: check @AllowUserTypes — default admin
    Guard->>Mid: store userId, userType

    App->>UC: execute({ customerDocument, vehicle, ... })

    UC->>DB: SELECT Customer WHERE document
    alt customer existe
        DB-->>UC: customer
    else customer não existe
        UC->>DB: INSERT Customer
        DB-->>UC: customer
    end

    UC->>DB: SELECT Vehicle WHERE customerId + plate
    alt vehicle existe
        DB-->>UC: vehicle
    else vehicle não existe
        UC->>DB: INSERT Vehicle
        DB-->>UC: vehicle
    end

    loop cada service
        UC->>DB: SELECT Service WHERE id
        DB-->>UC: service (priceCents snapshot)
    end

    loop cada part
        UC->>DB: SELECT Part WHERE id
        DB-->>UC: part (priceCents snapshot)
    end

    UC->>DB: INSERT ServiceOrder<br/>(status: Received)<br/>+ snapshots services & parts
    DB-->>UC: serviceOrder

    UC->>NR: recordCustomEvent("ServiceOrderCreated", {<br/>  serviceOrderId, customerId,<br/>  status, totalCents, correlationId<br/>})

    UC-->>App: serviceOrder
    App->>W: log.info("Service order created", {<br/>  correlationId, serviceOrderId,<br/>  customerId, statusCode: 201,<br/>  responseTime<br/>})
    W->>NR: forward log (application_logging)
    App-->>GW: 201 + JSON { serviceOrder }
    GW-->>A: 201
```

## Atributos da request

| Header / Body | Valor exemplo |
|---|---|
| `Authorization` | `Bearer eyJhbGciOi...` (JWT admin) |
| `X-Correlation-ID` | `7b4a2cf2-9d3b-4a1e-8e51-3c6b9d1f0a22` (opcional na request; sempre retornado na response) |
| Body | `{ "customerDocument": "111.444.777-35", "vehicle": { "plate": "ABC1234", ... }, "serviceIds": [...] }` |

## Side effects no New Relic

- 1 Transaction APM (`POST /admin/service-orders`)
- 1 Custom Event `ServiceOrderCreated`
- 1-N entradas de Log (Winston → application_logging forwarding)
- Distributed Tracing automático cobre DB calls

## Transição de status disparando Notify Lambda

`POST /admin/service-orders/:id/finalize` segue o mesmo padrão, mas adicionalmente:

```mermaid
sequenceDiagram
    participant App as NestJS Pod
    participant NC as NotificationClient
    participant LN as Lambda Notify
    participant SNS as SNS Topic

    Note over App: após updateStatus(Finalized)

    App->>NC: notifyStatusChange(payload)
    NC->>NC: getCorrelationId() + headers
    NC-)LN: POST /notify/status-change<br/>(fire-and-forget, timeout 3s)
    LN->>LN: validate fields
    LN->>SNS: publish message
    SNS-->>LN: messageId
    LN-->>NC: 200 { sent: true } (ignorado)
    Note over App: response 200 ao admin já foi enviada
```

A chamada para a Lambda é **assíncrona** (RxJS `firstValueFrom` sem await). Se a Lambda estiver down ou demorar, a response ao admin não é bloqueada. Falha é apenas logada.

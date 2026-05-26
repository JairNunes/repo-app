# Sequência — Abertura de ordem de serviço

Fluxo do `POST /admin/service-orders`, com middleware de correlation ID, guard e custom event.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant GW as API Gateway
    participant Mid as CorrelationIdMiddleware
    participant Guard as CombinedAuthGuard
    participant UC as CreateServiceOrderUseCase
    participant DB as RDS PostgreSQL
    participant NR as New Relic
    participant W as Winston

    A->>GW: POST /admin/service-orders<br/>Bearer eyJ... · X-Correlation-ID: opcional
    GW->>Mid: HTTP proxy via NLB
    Mid->>Mid: lê header ou gera UUID v4
    Mid->>Mid: AsyncLocalStorage.run({ correlationId })
    Mid->>Mid: setHeader response
    Mid->>Guard: canActivate
    Guard->>Guard: validateJWT + extrair {sub, type}
    Guard->>Guard: check @AllowUserTypes (default admin)
    Guard->>Mid: store userId, userType

    Guard->>UC: execute({ customerDocument, vehicle, ... })

    UC->>DB: SELECT/INSERT Customer
    UC->>DB: SELECT/INSERT Vehicle
    loop services
        UC->>DB: SELECT Service
    end
    loop parts
        UC->>DB: SELECT Part
    end
    UC->>DB: INSERT ServiceOrder + snapshots
    DB-->>UC: serviceOrder

    UC->>NR: recordCustomEvent("ServiceOrderCreated", {<br/>  serviceOrderId, customerId, status, totalCents<br/>})

    UC-->>Mid: serviceOrder
    Mid->>W: log.info("HTTP request completed", {<br/>  correlationId, method, path, statusCode, responseTime<br/>})
    W->>NR: forward (application_logging)
    Mid-->>GW: 201 + JSON
    GW-->>A: 201 · X-Correlation-ID
```

Toda request passa pelo `CorrelationIdMiddleware` primeiro. Se vier `X-Correlation-ID` no header, ele é reutilizado (propagação entre serviços); caso contrário, gera UUID v4. O ID fica no `AsyncLocalStorage` durante todo o ciclo, então Winston e custom events do New Relic capturam automaticamente sem ter que passar nada como parâmetro.

O `CombinedAuthGuard` estende o `AuthGuard('jwt')` do Passport. Depois da validação padrão, lê o `@AllowUserTypes` da rota e decide. Default sem decorator é só admin — preserva o comportamento da Fase 2 sem precisar tocar nos controllers existentes.

Cada transição de status posterior (`/start-diagnosis`, `/finalize` etc.) emite outro custom event `ServiceOrderStatusChanged`. Os use-cases de `finalize` e `deliver` adicionalmente chamam a Lambda Notify:

```mermaid
sequenceDiagram
    participant App as NestJS
    participant NC as NotificationClient
    participant LN as Lambda Notify
    participant SNS as SNS Topic

    Note over App: depois de updateStatus(Finalized)
    App->>NC: notifyStatusChange(payload)
    NC->>NC: getCorrelationId + headers
    NC-)LN: POST /notify/status-change (timeout 3s)
    LN->>LN: validate fields
    LN->>SNS: publish
    SNS-->>LN: messageId
    LN-->>NC: 200 { sent: true } (ignorado)
    Note over App: response 201 já foi enviada ao admin
```

A chamada à Lambda Notify usa RxJS sem `await` (fire-and-forget). Se a Lambda demorar ou cair, o `catchError` loga warning e o fluxo do admin não trava. Falha vira métrica `ServiceOrderError` no New Relic, que é parte do alerta de falha em OS.

# Diagrama de Sequência — Autenticação por CPF

Fluxo completo do `POST /auth/cpf`. Cobre happy path + cenários de erro.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant GW as API Gateway
    participant L as Lambda Auth
    participant DB as RDS PostgreSQL
    participant NR as New Relic

    C->>GW: POST /auth/cpf { "cpf": "111.444.777-35" }
    GW->>L: Invoke (HTTP integration)
    L->>L: parse body + sanitize CPF
    L->>L: isValidCpf(cpf) — algoritmo<br/>dígitos verificadores
    alt CPF formato inválido
        L-->>GW: 400 { error: "CPF inválido" }
        GW-->>C: 400
        L-->>NR: AuthenticationFailure { reason: "invalid_cpf" }
    end

    L->>DB: SELECT id, name, document, "createdAt"<br/>FROM "Customer"<br/>WHERE document = $1
    DB-->>L: row | null

    alt Cliente não cadastrado
        L-->>GW: 404 { error: "Cliente não cadastrado" }
        GW-->>C: 404
        L-->>NR: AuthenticationFailure { reason: "customer_not_found" }
    end

    L->>L: issueJwt({<br/>  sub: customer.id,<br/>  cpf: customer.document,<br/>  type: "customer",<br/>  exp: now + 24h<br/>})
    L-->>NR: AuthenticationSuccess { userId, type: "customer" }
    L-->>GW: 200 {<br/>  access_token: "eyJ...",<br/>  token_type: "Bearer",<br/>  expires_in: 86400<br/>}
    GW-->>C: 200 + JWT

    Note over C,GW: Cliente usa o JWT em headers posteriores<br/>(Authorization: Bearer eyJ...)
```

## Atributos relevantes

| Atributo | Valor |
|---|---|
| Endpoint | `POST {{api-gateway}}/auth/cpf` |
| Auth (na borda) | Nenhuma (validação interna no handler) |
| Connection pooling DB | Lambda cache `cachedClient` (entre invocações da mesma execution context) |
| Timeout total | 15s (SAM Globals.Function.Timeout) |
| Cold start típico | 1-3s (primeira invocação após inatividade) |
| Throughput esperado | Free tier: 1M req/mês |

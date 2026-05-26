# Sequência — Autenticação por CPF

Fluxo do `POST /auth/cpf`, incluindo erros.

```mermaid
sequenceDiagram
    autonumber
    actor C as Cliente
    participant GW as API Gateway
    participant L as Lambda Auth
    participant DB as RDS PostgreSQL
    participant NR as New Relic

    C->>GW: POST /auth/cpf { "cpf": "111.444.777-35" }
    GW->>L: Invoke
    L->>L: parse body + sanitize
    L->>L: isValidCpf(cpf)
    alt CPF formato inválido
        L-->>GW: 400 { error: "CPF inválido" }
        L-->>NR: AuthenticationFailure { reason: "invalid_cpf" }
        GW-->>C: 400
    end

    L->>DB: SELECT id, name, document FROM "Customer" WHERE document = $1
    DB-->>L: row | null

    alt Cliente não cadastrado
        L-->>GW: 404 { error: "Cliente não cadastrado" }
        L-->>NR: AuthenticationFailure { reason: "customer_not_found" }
        GW-->>C: 404
    end

    L->>L: jwt.sign({ sub, cpf, type: "customer", exp: now+24h })
    L-->>NR: AuthenticationSuccess { userId, type: "customer" }
    L-->>GW: 200 { access_token, token_type: "Bearer", expires_in: 86400 }
    GW-->>C: 200
```

A Lambda mantém o cliente PostgreSQL em cache (`cachedClient`) entre invocações no mesmo execution context. Isso reduz o cold start nas chamadas subsequentes — primeira invocação leva 1-3s, segundas em diante ficam abaixo de 100ms.

O CPF é sanitizado antes de tudo (`replace(/\D/g, '')`) — aceita `123.456.789-09`, `123 456 789 09` ou `12345678909`. Depois passa pelo algoritmo de dígitos verificadores. Repetições tipo `11111111111` são rejeitadas mesmo que matematicamente passem (caso conhecido).

O JWT é assinado com o mesmo `JWT_SECRET` da app principal pra que o guard combinado consiga validar. Payload mínimo: `sub` (uuid do customer), `cpf` (raw), `type: "customer"`, `iat` e `exp`.

Timeout total da Lambda configurado em 15s no SAM. Free tier da AWS cobre 1M invocações/mês e 400.000 GB-s, o que sobra muito pro escopo.

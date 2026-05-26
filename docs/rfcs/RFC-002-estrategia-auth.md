# RFC-002 — Estratégia de autenticação por CPF

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Autor** | Jair Nunes |

## Contexto

O PDF da Fase 3 exige uma **Function Serverless para autenticação por CPF**. A Fase 2 já tem auth por email/senha (admin) com Passport + JWT. A nova auth precisa:

- Receber CPF do cliente
- Validar o CPF
- Verificar se o cliente existe no banco
- Retornar um token de acesso para chamar a API

E precisa **coexistir** com a auth admin já existente.

## Alternativas

### A. Lambda standalone retornando JWT

```
Cliente → API Gateway → Lambda → RDS → JWT
                          ↓
                  jsonwebtoken.sign({ sub, cpf, type: "customer" })
```

Mesmo `JWT_SECRET` da app principal. O guard combinado da app verifica o `type` no payload e diferencia admin vs customer.

### B. Lambda + AWS Cognito User Pool

```
Cliente → API Gateway → Lambda (custom auth challenge) → Cognito → JWT
```

Cognito gera o JWT. Lambda faz custom auth challenge para validar CPF.

### C. Lambda como API Gateway Authorizer

```
Cliente → API Gateway → Authorizer Lambda → contexto
```

Lambda funcionaria como Lambda Authorizer (REQUEST type), validando o JWT a cada chamada. Não emite token — apenas autoriza.

## Decisão

**Escolhido: A — Lambda standalone retornando JWT.**

### Motivos

1. **Simplicidade ganha ao não usar Cognito.** Cognito é poderoso mas pesado: gerenciamento de user pool, identity pool, app clients, hosted UI, MFA opcional. Para o escopo acadêmico (cliente faz login só pelo CPF, sem confirmação de email/MFA), Cognito é overkill.
2. **Mesma chave de assinatura JWT** facilita a verificação pela app principal — basta importar o `jsonwebtoken` e o `JWT_SECRET`.
3. **Lambda Authorizer (opção C) não emite token** — só autoriza chamadas. Como o PDF pede "soluções serverless para autenticação", interpretamos como necessidade de emissão.
4. **Custo: opção A é a mais barata.** Cognito tem custo após 50k MAU (gratuito até lá), mas o overhead operacional + complexidade são maiores que o benefício.

## Trade-offs

### Sem refresh token, sem MFA

O JWT tem 24h de validade. Após esse período, cliente precisa enviar CPF novamente. Aceitável para o caso de uso (oficina mecânica não precisa de session longeva nem MFA).

### Sem confirmação de identidade

Lambda só checa se o CPF existe no banco. Qualquer um que conheça o CPF de um cliente cadastrado pode gerar JWT. **Em produção real**, adicionaríamos:

- SMS/email OTP
- Confirmação por link mágico
- Rate limiting por CPF no API Gateway

No contexto acadêmico, decisão é deliberada.

### JWT secret compartilhado

App principal e Lambda compartilham o mesmo `JWT_SECRET`. Rotação afeta os dois. Em produção, considerar:

- KMS para assinar/verificar (asymmetric)
- Cognito (que gerencia rotação)
- JWKS endpoint

## Decisão complementar — diferenciação admin vs customer

JWT payload tem campo `type`:

```json
{ "sub": "uuid", "cpf": "11144477735", "type": "customer", "iat": 1, "exp": 2 }
```

App principal usa `CombinedAuthGuard` ([`src/shared/guards/combined-auth.guard.ts`](../../src/shared/guards/combined-auth.guard.ts)):

- Default: rota só aceita `type: "admin"`
- Decorator `@AllowUserTypes('admin', 'customer')` libera ambos
- Decorator `@AllowUserTypes('customer')` libera só customer (futuro: portal do cliente)

## Consequências

- `repo-lambda-auth` ganha 2 endpoints (auth + notify) — boa coesão (ambos são "serverless do projeto")
- App principal ganha guard + jwt.strategy estendida para extrair `type`
- README dos 4 repos documenta o fluxo de auth
- Diagrama de sequência em [`sequence-auth-cpf.md`](../architecture/sequence-auth-cpf.md)

## Referências

- [JWT RFC 7519](https://datatracker.ietf.org/doc/html/rfc7519)
- [NestJS Passport JWT](https://docs.nestjs.com/recipes/passport)
- [AWS Lambda Authorizer types](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html)

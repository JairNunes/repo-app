# ADR-003 — AWS API Gateway como ponto único de entrada

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Decisor** | Jair Nunes |

## Contexto

A arquitetura tem 2 destinos para tráfego externo:

1. **Lambdas** (`/auth/cpf`, `/notify/status-change`)
2. **App NestJS no EKS** (`/admin/*`, `/service-orders/*`, `/health`, `/docs`)

O PDF exige API Gateway. Decisão: **um único API Gateway** ou dois?

## Decisão

**Um único AWS API Gateway HTTP API**, com duas integrações:

| Caminho | Integration type | Destino |
|---|---|---|
| `POST /auth/cpf` | AWS_PROXY (Lambda) | Lambda Auth |
| `POST /notify/status-change` | AWS_PROXY (Lambda) | Lambda Notify |
| `ANY /admin/{proxy+}` | HTTP_PROXY | NLB do EKS |
| `ANY /service-orders/{proxy+}` | HTTP_PROXY | NLB do EKS |
| `GET /health` | HTTP_PROXY | NLB do EKS |
| `GET /docs` | HTTP_PROXY | NLB do EKS |

Owner: **`repo-lambda-auth` define o API Gateway** no SAM template, e o `repo-infra-k8s` adiciona as rotas HTTP via Terraform (referenciando o `aws_apigatewayv2_api` criado).

## Alternativas consideradas

### A. Dois API Gateways

Um para Lambdas, outro para EKS. Mais isolado, cada repo gerencia o próprio.

- ✅ Acoplamento zero entre repos
- ❌ Cliente teria 2 URLs diferentes — ruim para UX e Postman collection
- ❌ Custo extra de outro API Gateway (mas free tier cobre)
- ❌ CORS, rate limiting, autorização configurados duas vezes

Rejeitada porque o PDF parece esperar um único ponto de entrada.

### B. NLB direto, sem API Gateway

Acessar o EKS via NLB DNS direto, sem passar pelo API Gateway.

- ❌ Quebra o requisito do PDF
- ❌ Perde rate limiting nativo do API Gateway
- ❌ Sem suporte a JWT authorizer nativo

Rejeitada.

### C. ALB Ingress Controller no EKS + Lambda standalone

ALB cuida do tráfego ao EKS, Lambda exposta diretamente via Function URL.

- ✅ Mais "Kubernetes-native"
- ❌ Quebra o requisito do API Gateway
- ❌ Function URL não tem custom domain fácil

Rejeitada.

## Consequências

### Acoplamento entre repos

O `repo-lambda-auth` (que define o API Gateway via SAM) precisa **exportar** o ID do API Gateway (e.g., via CloudFormation Export `oficina-mecanica-api-base-url`). O `repo-infra-k8s` **importa** esse output e adiciona rotas HTTP via `aws_apigatewayv2_route`.

Provisioning ordering:

```
1. repo-infra-db          → cria RDS
2. repo-lambda-auth       → cria API Gateway + Lambdas (export gateway ID)
3. repo-infra-k8s         → cria EKS + NLB + adiciona rotas HTTP no gateway existente
4. repo-app               → CI/CD push imagem ECR + kubectl apply
```

### Latência

Cliente → API Gateway → NLB → Pod adiciona 1 hop em relação a NLB direto. Custo típico: +20-50ms. Aceitável.

### Rate limiting + WAF

Centralizado no API Gateway. Configurável via AWS Web Application Firewall (não escopo da Fase 3).

### Custom domain

Possível via AWS API Gateway custom domain (Route 53 + ACM). Não escopo da Fase 3. Cliente acessa via URL gerada (`<api-id>.execute-api.us-east-1.amazonaws.com`).

## Diagrama

Ver [`docs/architecture/components.md`](../architecture/components.md).

## Referências

- [AWS API Gateway HTTP vs REST](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html)
- [SAM HTTP API + Lambda](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html)
- [API Gateway → VPC Link → NLB](https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-private-integration.html) (alternativa: para tráfego dentro da VPC)

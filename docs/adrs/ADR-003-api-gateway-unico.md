# ADR-003 — Um único API Gateway na frente de tudo

Status: aceita
Data: 05/2026

## Contexto

Tem dois destinos pra tráfego externo: as Lambdas (`/auth/cpf`, `/notify/status-change`) e a app NestJS no EKS (`/admin/*`, `/service-orders/*`, `/health`, `/docs`). A pergunta é se cada destino tem seu próprio API Gateway ou se centraliza num só.

## Decisão

Um único AWS API Gateway HTTP API com duas integrações. As rotas Lambda usam `AWS_PROXY`, as rotas EKS usam `HTTP_PROXY` apontando pro NLB do cluster.

| Caminho | Integração | Destino |
|---|---|---|
| `POST /auth/cpf` | AWS_PROXY | Lambda Auth |
| `POST /notify/status-change` | AWS_PROXY | Lambda Notify |
| `ANY /admin/{proxy+}` | HTTP_PROXY | NLB do EKS |
| `ANY /service-orders/{proxy+}` | HTTP_PROXY | NLB do EKS |
| `GET /health`, `GET /docs` | HTTP_PROXY | NLB do EKS |

O API Gateway é criado pelo SAM template do `repo-lambda-auth`. O `repo-infra-k8s` referencia o ID exportado pelo CloudFormation e adiciona as rotas HTTP via Terraform.

Dois gateways teriam isolamento zero entre repos, mas cliente precisaria conhecer duas URLs (ruim pra Postman, ruim pra demo), CORS e rate limit teriam que ser configurados nos dois lugares e o custo dobra (ainda dentro do free tier, mas dobra). NLB direto sem API Gateway quebra o requisito do PDF.

## Consequências

Existe um acoplamento de provisioning entre os repos. O `repo-lambda-auth` cria o gateway, o `repo-infra-k8s` precisa importar o output. Ordem manda: `repo-infra-db` (RDS) → `repo-lambda-auth` (gateway + Lambdas) → `repo-infra-k8s` (cluster + rotas HTTP no gateway existente) → push no `repo-app` (CI/CD faz build, push pro ECR, kubectl apply).

Adiciona +20-50ms de latência (cliente → API Gateway → NLB → pod). Pra escopo acadêmico, irrelevante.

Centraliza rate limit, CORS e logging na borda. Custom domain (via Route 53 + ACM) é fácil de adicionar depois, mas fica fora do escopo. WAF também — pluga depois se precisar.

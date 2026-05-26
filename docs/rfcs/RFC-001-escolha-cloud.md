# RFC-001 — Escolha do provedor cloud

| Campo | Valor |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-05 |
| **Autor** | Jair Nunes — Grupo 72 |
| **Decisores** | Jair Nunes |

## Contexto

O Tech Challenge Fase 3 exige migrar o monorepo da Fase 2 para arquitetura cloud-native com 4 componentes mandatórios:

1. **Function Serverless** para autenticação por CPF
2. **API Gateway** como ponto único de entrada
3. **Banco gerenciado** (não pode mais ser pod no cluster)
4. **Cluster Kubernetes** com HPA
5. **Ferramenta de observabilidade** (Datadog ou New Relic)

Como o projeto é acadêmico (estudante), o critério "free tier mais documentado e completo" tem peso.

## Alternativas

### A. AWS

| Aspecto | Detalhe |
|---|---|
| Function Serverless | Lambda (Node.js 20 nativo) |
| API Gateway | AWS API Gateway HTTP API |
| Banco | RDS PostgreSQL |
| K8s | EKS |
| Free tier Lambda | 1M req/mês + 400.000 GB-s |
| Free tier API GW | 1M chamadas/mês |
| Free tier RDS | 750h `db.t2.micro` (primeiros 12 meses) |
| Free tier EKS | ❌ control plane US$73/mês |
| IaC suportado | Terraform, CDK, SAM |

### B. Google Cloud Platform

| Aspecto | Detalhe |
|---|---|
| Function Serverless | Cloud Functions |
| API Gateway | API Gateway |
| Banco | Cloud SQL PostgreSQL |
| K8s | GKE (Autopilot ou Standard) |
| Free tier | $300 crédito por 90 dias |
| Autopilot | Free tier 1 cluster zonal |
| IaC suportado | Terraform, gcloud |

### C. Azure

| Aspecto | Detalhe |
|---|---|
| Function Serverless | Azure Functions |
| API Gateway | API Management |
| Banco | Azure Database for PostgreSQL |
| K8s | AKS (control plane gratuito!) |
| Free tier | $200 crédito por 30 dias |
| IaC suportado | Terraform, Bicep |

## Decisão

**Escolhido: AWS.**

### Motivos

1. **Familiaridade do autor com a stack AWS.** Maior parte do material da Pós FIAP usa AWS. Reduz tempo de pesquisa.
2. **Ecossistema Lambda + API Gateway + RDS** é o mais documentado e testado de todos. SAM (Serverless Application Model) acelera o setup.
3. **Tutoriais e exemplos abundantes** para a combinação exata exigida pelo PDF.
4. **Compatibilidade com observabilidade:** New Relic tem integração nativa com AWS Lambda Layer e EKS via `nri-bundle` Helm chart.
5. **CLI maduras:** `aws`, `sam`, `eksctl`, `kubectl` — todas disponíveis e estáveis.

## Trade-offs

### Custo

EKS control plane: **US$0.10/hora ≈ US$73/mês**. Sem free tier. Mitigação:

- **Estratégia "subir, gravar, derrubar":** provisionar a infra completa apenas para gravação do vídeo demonstrativo, depois `terraform destroy`. Custo total da entrega ≈ **US$5-10** se feito em 1 dia.
- Alternativa considerada: usar **Azure AKS** (control plane grátis) ou **GCP GKE Autopilot** (grátis num cluster zonal). Rejeitada porque a curva de aprendizado das outras clouds atrasaria a entrega.

### Cold start de Lambda

Node.js Lambda em VPC tem cold start típico de 1-3s. Para um app acadêmico, é aceitável. Mitigação: provisioned concurrency (paga extra) — não usada.

### Vendor lock-in

Uso intensivo de Lambda, API Gateway, RDS e EKS. Migrar para outra cloud exigiria reescrever IaC e SAM template. Aceitável dado escopo.

## Consequências

- 4 repos provisionados em **us-east-1** (região mais barata + mais free tier).
- Terraform usado para RDS e EKS; SAM para Lambdas + API Gateway.
- ECR substitui artifact local de imagem Docker (Fase 2 usava `actions/upload-artifact`).
- Credenciais via OIDC (preferível) ou GitHub Secrets `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`.

## Referências

- [AWS Free Tier](https://aws.amazon.com/free/)
- [SAM Specification](https://docs.aws.amazon.com/serverless-application-model/)
- [EKS Pricing](https://aws.amazon.com/eks/pricing/)

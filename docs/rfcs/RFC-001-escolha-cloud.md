# RFC-001 — Escolha da nuvem

Status: aceita
Data: 05/2026
Autor: Jair Nunes

## Contexto

A Fase 3 obriga sair do monorepo da Fase 2 pra uma arquitetura cloud com 4 componentes não-negociáveis: function serverless pra autenticar por CPF, API Gateway na frente, banco gerenciado (não pode mais ser pod no cluster), cluster Kubernetes com HPA e ferramenta de observabilidade (Datadog ou New Relic). Precisa decidir em qual nuvem rodar.

## Opções consideradas

**AWS.** Lambda, API Gateway HTTP API, RDS PostgreSQL e EKS. Free tier cobre Lambda (1M req/mês), API Gateway (1M chamadas/mês) e RDS db.t2.micro nos 12 meses iniciais. EKS control plane não tem free tier — sangra ~US$73/mês.

**GCP.** Cloud Functions, API Gateway, Cloud SQL e GKE Autopilot. Crédito de US$300 por 90 dias. Autopilot tem 1 cluster zonal grátis, o que mata o problema do control plane.

**Azure.** Functions, API Management, Database for PostgreSQL e AKS. AKS control plane é gratuito de fato. Crédito de US$200 por 30 dias.

## Decisão

AWS, na região `us-east-1`. Os motivos foram pragmáticos:

A maior parte do material da Pós e dos tutoriais que consultei usa AWS — isso reduz o tempo de pesquisa quando trava em algo específico. SAM (Serverless Application Model) deixa o setup Lambda + API Gateway com poucas linhas de YAML, sem ter que provisionar cada peça à mão. Já uso AWS no dia a dia, então a curva de aprendizado é zero. New Relic tem integração nativa com Lambda Layer e com EKS via Helm chart, sem fricção.

O ponto negativo é o EKS control plane caro. A estratégia pra contornar isso é simples: subir tudo no dia da gravação do vídeo, gravar, derrubar. O custo total da entrega fica na faixa de US$5-10. AKS gratuito era tentador, mas a economia não compensa o tempo de aprender uma stack que não vou usar depois.

Cold start de Lambda Node.js em VPC fica entre 1-3 segundos. Em projeto acadêmico isso é aceitável — não vou pagar provisioned concurrency.

## Consequências

Os 4 repos provisionam em `us-east-1`. Terraform cuida do RDS e do EKS, SAM cuida das Lambdas e do API Gateway. ECR substitui o `actions/upload-artifact` que a Fase 2 usava pra distribuir a imagem Docker. Credenciais AWS entram via GitHub Secrets (`AWS_ACCESS_KEY_ID` e `AWS_SECRET_ACCESS_KEY`); OIDC seria mais limpo mas pra escopo acadêmico não compensa.

# RFC-002 — Estratégia de autenticação por CPF

Status: aceita
Data: 05/2026
Autor: Jair Nunes

## Contexto

O PDF exige uma function serverless pra autenticar cliente por CPF. A Fase 2 já tem login admin via email/senha com Passport e JWT. A nova auth precisa receber o CPF, validar, checar se o cliente existe no banco e devolver um token. E precisa coexistir com a auth admin que já está rodando.

## Opções consideradas

**Lambda standalone que emite JWT.** O cliente envia CPF, a Lambda valida, consulta a tabela `Customer` no RDS e assina um JWT com o mesmo `JWT_SECRET` que a app principal usa. O payload carrega `type: "customer"` pra diferenciar de admin.

**Lambda + AWS Cognito.** Cognito gera o token; a Lambda funciona como custom auth challenge pra validar o CPF antes do Cognito liberar. Mais robusto mas adiciona user pool, identity pool, app clients e hosted UI pra gerenciar.

**Lambda Authorizer (REQUEST type).** A Lambda vira authorizer do API Gateway — recebe o token a cada request e diz se autoriza ou não. Não emite token nenhum.

## Decisão

Lambda standalone emitindo JWT. Cognito é overkill aqui — não tem MFA, não tem confirmação por email, não tem hosted UI no escopo. O ROI de Cognito num projeto acadêmico é negativo: ganha complexidade, perde clareza. Lambda Authorizer só autoriza, não emite token, e o PDF parece esperar emissão de token serverless.

Compartilhar o `JWT_SECRET` entre app e Lambda é o que faz tudo encaixar sem ginástica. A app já valida JWT no Passport; basta estender a strategy pra extrair o campo `type` do payload. Um guard combinado (`CombinedAuthGuard`) lê o `type` e decide se a rota aceita admin, customer ou ambos. Default é admin pra preservar o comportamento da Fase 2.

Não tem refresh token nem MFA. Token expira em 24h e o cliente envia o CPF de novo. Em produção real, eu mandaria SMS/OTP antes de emitir o token e adicionaria rate limit no API Gateway por CPF — mas isso fica explicitamente fora do escopo.

## Consequências

A app principal ganha o `CombinedAuthGuard` em `src/shared/guards/` e a `jwt.strategy.ts` extrai mais um campo do payload. O `auth.service.ts` da Fase 2 passa a assinar token com `type: "admin"` pra coerência. A Lambda mora no `repo-lambda-auth` junto com a Lambda Notify — boa coesão (ambas são "serverless do projeto"). O secret é gerenciado no GitHub Secrets dos dois repos. Rotação requer atualizar nos dois lugares. Pra produção, considerar KMS (assimétrico) ou JWKS endpoint.

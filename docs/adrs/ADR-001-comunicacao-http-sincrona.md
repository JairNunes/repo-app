# ADR-001 — Comunicação HTTP síncrona entre serviços

Status: aceita
Data: 05/2026

## Contexto

A arquitetura tem 4 pontos de comunicação entre componentes: cliente → API Gateway (HTTPS, sem alternativa), API Gateway → Lambdas (integração nativa AWS), API Gateway → NLB do EKS (proxy HTTP), e app NestJS → Lambda Notify quando uma OS muda de status. O último ponto é o único onde existe escolha real: HTTP direto, fila (SQS), evento (EventBridge) ou publicar no SNS direto do app pulando a Lambda.

## Decisão

Tudo síncrono via HTTP. Nada de fila, nada de event bus. A notificação da Lambda é HTTP POST fire-and-forget — a app dispara a chamada com timeout de 3s e segue o fluxo sem esperar a resposta. Se a Lambda estiver fora, registra warning no log e o cliente continua vendo a OS marcada como Finalized normalmente.

```ts
this.http.post(this.endpoint, payload, { headers })
  .pipe(timeout(3000), catchError(err => { this.logger.warn(...); return of(null); }))
```

Considerei publicar no SNS direto do app pra eliminar o hop da Lambda, mas o PDF exige uma Lambda de notificação — tirar ela do caminho descumpre o escopo. SQS entre app e Lambda traria robustez (retry automático, dead letter queue) mas não justifica a complexidade pra um app acadêmico cujo cold start já é aceitável. EventBridge serviria se tivéssemos múltiplos consumidores, o que não é o caso.

## Consequências

A leitura do código fica direta — quem quer entender o fluxo lê o use-case e vê a chamada HTTP, sem precisar olhar configuração de fila ou event source. O `correlationId` se propaga pelo header da request, então no New Relic dá pra filtrar logs por `correlationId` e ver a request original junto da chamada à Lambda no mesmo trace.

O preço é silenciar falhas: se a Lambda Notify cair, o cliente não recebe email mas a OS é marcada como Finalized do mesmo jeito. Mitigo isso com um custom event `ServiceOrderError` no New Relic que vira parte do alerta de falha em OS.

Quando vale repensar essa decisão: volume passar de ~1.000 OS/dia, notificações perdidas virarem reclamação real, ou aparecer um segundo consumidor desses eventos (analytics, CRM). Aí migra pra SNS direto ou EventBridge.

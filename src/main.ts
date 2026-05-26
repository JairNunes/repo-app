// newrelic precisa carregar antes de tudo.
if (process.env.NEW_RELIC_LICENSE_KEY) {
  try {
    require('newrelic');
  } catch (e) {
    console.warn('[main] newrelic agent not loaded:', (e as Error).message);
  }
}

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { WINSTON_MODULE_NEST_PROVIDER, WinstonModule } from 'nest-winston';
import { AppModule } from './app.module';
import { winstonConfig } from './shared/logging/winston.config';
import { CORRELATION_HEADER } from './shared/logging/correlation-id';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swagger = new DocumentBuilder()
    .setTitle('Auto Repair Shop API — Fase 3')
    .setDescription(
      'API NestJS para gestão de oficina mecânica. ' +
        'Autenticação via JWT (admin email/senha ou customer via Lambda CPF). ' +
        'Correlation ID propagado em todas requests via header `' +
        CORRELATION_HEADER +
        '`.',
    )
    .setVersion('2.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Auto Repair Shop API listening on http://0.0.0.0:${port}`);
}

bootstrap();

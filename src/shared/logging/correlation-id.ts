import { AsyncLocalStorage } from 'async_hooks';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuid } from 'uuid';

export interface CorrelationStore {
  correlationId: string;
  userId?: string;
  userType?: 'admin' | 'customer';
}

export const correlationStorage = new AsyncLocalStorage<CorrelationStore>();

export function getCorrelationId(): string | undefined {
  return correlationStorage.getStore()?.correlationId;
}

export function getCorrelationStore(): CorrelationStore | undefined {
  return correlationStorage.getStore();
}

export const CORRELATION_HEADER = 'x-correlation-id';

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction): void {
    const incoming = req.headers[CORRELATION_HEADER];
    const correlationId =
      typeof incoming === 'string' && incoming.length > 0 ? incoming : uuid();

    res.setHeader(CORRELATION_HEADER, correlationId);

    correlationStorage.run({ correlationId }, () => {
      next();
    });
  }
}

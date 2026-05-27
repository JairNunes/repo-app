import { Injectable, Optional } from '@nestjs/common';

type NewRelicAgent = {
  recordCustomEvent: (eventType: string, attributes: Record<string, unknown>) => void;
  addCustomAttributes: (attributes: Record<string, unknown>) => void;
  recordMetric: (name: string, value: number) => void;
  noticeError?: (err: Error, attributes?: Record<string, unknown>) => void;
};

function getNewRelic(): NewRelicAgent | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('newrelic') as NewRelicAgent;
  } catch {
    return null;
  }
}

@Injectable()
export class CustomMetricsService {
  private readonly nr: NewRelicAgent | null;

  constructor(@Optional() agent?: NewRelicAgent) {
    this.nr = agent ?? getNewRelic();
  }

  recordServiceOrderCreated(payload: {
    serviceOrderId: string;
    customerId: string;
    status: string;
    totalCents: number;
  }): void {
    this.nr?.recordCustomEvent('ServiceOrderCreated', payload);
  }

  recordServiceOrderStatusChanged(payload: {
    serviceOrderId: string;
    fromStatus: string;
    toStatus: string;
    durationMinutes?: number;
  }): void {
    this.nr?.recordCustomEvent('ServiceOrderStatusChanged', payload);
  }

  recordAuthSuccess(payload: { userId: string; type: 'admin' | 'customer' }): void {
    this.nr?.recordCustomEvent('AuthenticationSuccess', payload);
  }

  recordAuthFailure(payload: { reason: string; type: 'admin' | 'customer' }): void {
    this.nr?.recordCustomEvent('AuthenticationFailure', payload);
  }

  recordServiceOrderError(payload: {
    serviceOrderId?: string;
    operation: string;
    error: string;
  }): void {
    this.nr?.recordCustomEvent('ServiceOrderError', payload);
  }

  addRequestAttributes(attrs: Record<string, unknown>): void {
    this.nr?.addCustomAttributes(attrs);
  }

  noticeError(err: Error, attrs?: Record<string, unknown>): void {
    this.nr?.noticeError?.(err, attrs);
  }
}

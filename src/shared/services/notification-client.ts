import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';
import { getCorrelationId, CORRELATION_HEADER } from '../logging/correlation-id';

export interface StatusChangePayload {
  serviceOrderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  previousStatus: string;
  newStatus: string;
  vehiclePlate: string;
}

@Injectable()
export class NotificationClient {
  private readonly endpoint: string;

  constructor(
    private readonly config: ConfigService,
    private readonly http: HttpService,
    @Inject(WINSTON_MODULE_PROVIDER) private readonly logger: Logger,
  ) {
    this.endpoint = this.config.get<string>('NOTIFY_LAMBDA_URL') || '';
  }

  notifyStatusChange(payload: StatusChangePayload): void {
    if (!this.endpoint) {
      this.logger.warn('NOTIFY_LAMBDA_URL not configured, skipping notification', {
        serviceOrderId: payload.serviceOrderId,
      });
      return;
    }

    const correlationId = getCorrelationId();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (correlationId) headers[CORRELATION_HEADER] = correlationId;

    void firstValueFrom(
      this.http
        .post(this.endpoint, payload, { headers })
        .pipe(
          timeout(3000),
          catchError((err) => {
            this.logger.warn('Notification failed (fire-and-forget)', {
              serviceOrderId: payload.serviceOrderId,
              error: err?.message,
            });
            return of(null);
          }),
        ),
    );
  }
}

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IServiceOrderRepository as IServiceOrderToken } from '../ports/tokens';
import { ServiceOrder } from '@/domain/service-orders/service-order.entity';
import { NotFoundError } from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import { CustomMetricsService } from '@/shared/observability/custom-metrics.service';

@Injectable()
export class StartDiagnosisUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Optional() private readonly metrics?: CustomMetricsService,
  ) {}

  async execute(serviceOrderId: string) {
    const data = await this.serviceOrderRepository.findById(serviceOrderId);
    if (!data) {
      throw new NotFoundError('Service order not found');
    }

    const previousStatus = data.status;
    const serviceOrder = new ServiceOrder(data);
    serviceOrder.startDiagnosis();

    const updated = await this.serviceOrderRepository.updateStatus(
      serviceOrderId,
      ServiceOrderStatus.InDiagnosis,
      { diagnosisStartedAt: serviceOrder.diagnosisStartedAt },
    );

    this.metrics?.recordServiceOrderStatusChanged({
      serviceOrderId,
      fromStatus: previousStatus,
      toStatus: ServiceOrderStatus.InDiagnosis,
    });

    return updated;
  }
}

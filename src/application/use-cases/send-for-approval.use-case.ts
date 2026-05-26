import { Injectable, Inject } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IServiceOrderRepository as IServiceOrderToken } from '../ports/tokens';
import { ServiceOrder } from '@/domain/service-orders/service-order.entity';
import { NotFoundError } from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';

@Injectable()
export class SendForApprovalUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
  ) {}

  async execute(serviceOrderId: string) {
    const data = await this.serviceOrderRepository.findById(serviceOrderId);
    if (!data) {
      throw new NotFoundError('Service order not found');
    }

    const serviceOrder = new ServiceOrder(data);
    serviceOrder.sendForApproval();

    return this.serviceOrderRepository.updateStatus(
      serviceOrderId,
      ServiceOrderStatus.AwaitingApproval,
    );
  }
}

import { Injectable, Inject } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import {
  IServiceOrderRepository as IServiceOrderToken,
  IPartRepository as IPartToken,
} from '../ports/tokens';
import { ServiceOrder } from '@/domain/service-orders/service-order.entity';
import { NotFoundError } from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class ApproveQuoteUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Inject(IPartToken) private readonly partRepository: IPartRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(serviceOrderId: string) {
    const data = await this.serviceOrderRepository.findById(serviceOrderId);
    if (!data) {
      throw new NotFoundError('Service order not found');
    }

    const serviceOrder = new ServiceOrder(data);
    serviceOrder.approve();

    return this.prisma.$transaction(async () => {
      for (const part of data.parts) {
        await this.partRepository.decrementStock(part.partId, part.quantity);
      }

      return this.serviceOrderRepository.updateStatus(
        serviceOrderId,
        ServiceOrderStatus.InExecution,
        { executionStartedAt: serviceOrder.executionStartedAt },
      );
    });
  }
}

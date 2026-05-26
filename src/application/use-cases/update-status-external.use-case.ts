import { Injectable, Inject } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import {
  IServiceOrderRepository as IServiceOrderToken,
  IPartRepository as IPartToken,
} from '../ports/tokens';
import { ServiceOrder } from '@/domain/service-orders/service-order.entity';
import {
  NotFoundError,
  BusinessRuleViolationError,
} from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

export type ExternalAction =
  | 'approve'
  | 'reject'
  | 'start-diagnosis'
  | 'finalize'
  | 'deliver';

export interface UpdateStatusExternalInput {
  serviceOrderId: string;
  action: ExternalAction;
  source: string;
}

@Injectable()
export class UpdateStatusExternalUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Inject(IPartToken) private readonly partRepository: IPartRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateStatusExternalInput) {
    const data = await this.serviceOrderRepository.findById(
      input.serviceOrderId,
    );
    if (!data) {
      throw new NotFoundError('Service order not found');
    }

    const serviceOrder = new ServiceOrder(data);

    switch (input.action) {
      case 'start-diagnosis':
        serviceOrder.startDiagnosis();
        return this.serviceOrderRepository.updateStatus(
          input.serviceOrderId,
          ServiceOrderStatus.InDiagnosis,
          { diagnosisStartedAt: serviceOrder.diagnosisStartedAt },
        );

      case 'approve':
        serviceOrder.approve();
        return this.prisma.$transaction(async () => {
          for (const part of data.parts) {
            await this.partRepository.decrementStock(
              part.partId,
              part.quantity,
            );
          }
          return this.serviceOrderRepository.updateStatus(
            input.serviceOrderId,
            ServiceOrderStatus.InExecution,
            { executionStartedAt: serviceOrder.executionStartedAt },
          );
        });

      case 'reject':
        serviceOrder.reject();
        return this.serviceOrderRepository.updateStatus(
          input.serviceOrderId,
          ServiceOrderStatus.InDiagnosis,
        );

      case 'finalize':
        serviceOrder.finalize();
        return this.serviceOrderRepository.updateStatus(
          input.serviceOrderId,
          ServiceOrderStatus.Finalized,
          { finalizedAt: serviceOrder.finalizedAt },
        );

      case 'deliver':
        serviceOrder.deliver();
        return this.serviceOrderRepository.updateStatus(
          input.serviceOrderId,
          ServiceOrderStatus.Delivered,
          { deliveredAt: serviceOrder.deliveredAt },
        );

      default:
        throw new BusinessRuleViolationError(`Unknown action: ${input.action}`);
    }
  }
}

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import { ICustomerRepository } from '../ports/customer.repository.interface';
import { IVehicleRepository } from '../ports/vehicle.repository.interface';
import {
  IServiceOrderRepository as IServiceOrderToken,
  ICustomerRepository as ICustomerToken,
  IVehicleRepository as IVehicleToken,
} from '../ports/tokens';
import { ServiceOrder } from '@/domain/service-orders/service-order.entity';
import { NotFoundError } from '@/shared/errors/domain.error';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import { CustomMetricsService } from '@/shared/observability/custom-metrics.service';
import { NotificationClient } from '@/shared/services/notification-client';

@Injectable()
export class DeliverServiceOrderUseCase {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Inject(ICustomerToken)
    @Optional()
    private readonly customerRepository?: ICustomerRepository,
    @Inject(IVehicleToken)
    @Optional()
    private readonly vehicleRepository?: IVehicleRepository,
    @Optional() private readonly metrics?: CustomMetricsService,
    @Optional() private readonly notification?: NotificationClient,
  ) {}

  async execute(serviceOrderId: string) {
    const data = await this.serviceOrderRepository.findById(serviceOrderId);
    if (!data) {
      throw new NotFoundError('Service order not found');
    }

    const previousStatus = data.status;
    const serviceOrder = new ServiceOrder(data);
    serviceOrder.deliver();

    const updated = await this.serviceOrderRepository.updateStatus(
      serviceOrderId,
      ServiceOrderStatus.Delivered,
      { deliveredAt: serviceOrder.deliveredAt },
    );

    this.metrics?.recordServiceOrderStatusChanged({
      serviceOrderId,
      fromStatus: previousStatus,
      toStatus: ServiceOrderStatus.Delivered,
    });

    if (this.customerRepository && this.vehicleRepository && this.notification) {
      const customer = await this.customerRepository.findById(data.customerId);
      const vehicle = await this.vehicleRepository.findById(data.vehicleId);
      if (customer && vehicle) {
        this.notification.notifyStatusChange({
          serviceOrderId,
          customerId: customer.id,
          customerName: customer.name ?? 'Cliente',
          customerEmail: (customer as { email?: string }).email ?? '',
          previousStatus,
          newStatus: ServiceOrderStatus.Delivered,
          vehiclePlate: vehicle.plate,
        });
      }
    }

    return updated;
  }
}

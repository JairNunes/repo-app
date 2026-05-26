import { Injectable, Inject, Optional } from '@nestjs/common';
import { ICustomerRepository } from '../ports/customer.repository.interface';
import { IVehicleRepository } from '../ports/vehicle.repository.interface';
import { IServiceRepository } from '../ports/service.repository.interface';
import { IPartRepository } from '../ports/part.repository.interface';
import { IServiceOrderRepository } from '../ports/service-order.repository.interface';
import {
  ICustomerRepository as ICustomerToken,
  IVehicleRepository as IVehicleToken,
  IServiceRepository as IServiceToken,
  IPartRepository as IPartToken,
  IServiceOrderRepository as IServiceOrderToken,
} from '../ports/tokens';
import { Document } from '@/shared/validation/document.value-object';
import { Plate } from '@/shared/validation/plate.value-object';
import { NotFoundError } from '@/shared/errors/domain.error';
import { CustomMetricsService } from '@/shared/observability/custom-metrics.service';

export interface CreateServiceOrderInput {
  customerDocument: string;
  customerName?: string;
  vehicle: {
    plate: string;
    make: string;
    model: string;
    year: number;
  };
  serviceIds: { serviceId: string; quantity?: number }[];
  partIds: { partId: string; quantity: number }[];
}

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(ICustomerToken)
    private readonly customerRepository: ICustomerRepository,
    @Inject(IVehicleToken)
    private readonly vehicleRepository: IVehicleRepository,
    @Inject(IServiceToken)
    private readonly serviceRepository: IServiceRepository,
    @Inject(IPartToken) private readonly partRepository: IPartRepository,
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
    @Optional() private readonly metrics?: CustomMetricsService,
  ) {}

  async execute(input: CreateServiceOrderInput) {
    const document = Document.create(input.customerDocument);
    const plate = Plate.create(input.vehicle.plate);

    let customer = await this.customerRepository.findByDocument(
      document.getValue(),
    );
    if (!customer) {
      customer = await this.customerRepository.create({
        document: document.getValue(),
        name: input.customerName,
      });
    }

    let vehicle = await this.vehicleRepository.findByCustomerAndPlate(
      customer.id,
      plate.getValue(),
    );
    if (!vehicle) {
      vehicle = await this.vehicleRepository.create({
        customerId: customer.id,
        plate: plate.getValue(),
        make: input.vehicle.make,
        model: input.vehicle.model,
        year: input.vehicle.year,
      });
    }

    const services = [];
    for (const item of input.serviceIds) {
      const service = await this.serviceRepository.findById(item.serviceId);
      if (!service) {
        throw new NotFoundError(`Service ${item.serviceId} not found`);
      }
      services.push({
        serviceId: service.id,
        quantity: item.quantity || 1,
        unitPriceCentsSnapshot: service.priceCents,
      });
    }

    const parts = [];
    for (const item of input.partIds) {
      const part = await this.partRepository.findById(item.partId);
      if (!part) {
        throw new NotFoundError(`Part ${item.partId} not found`);
      }
      parts.push({
        partId: part.id,
        quantity: item.quantity,
        unitPriceCentsSnapshot: part.priceCents,
      });
    }

    const serviceOrder = await this.serviceOrderRepository.create({
      customerId: customer.id,
      vehicleId: vehicle.id,
      services,
      parts,
    });

    this.metrics?.recordServiceOrderCreated({
      serviceOrderId: serviceOrder.id,
      customerId: customer.id,
      status: serviceOrder.status,
      totalCents: serviceOrder.totalCentsSnapshot ?? 0,
    });

    return serviceOrder;
  }
}

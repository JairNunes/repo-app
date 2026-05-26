import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';

export interface ServiceOrderService {
  serviceId: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export interface ServiceOrderPart {
  partId: string;
  quantity: number;
  unitPriceCentsSnapshot: number;
}

export interface ServiceOrder {
  id: string;
  customerId: string;
  vehicleId: string;
  status: ServiceOrderStatus;
  totalCentsSnapshot: number;
  services: ServiceOrderService[];
  parts: ServiceOrderPart[];
  createdAt: Date;
  updatedAt: Date;
  diagnosisStartedAt?: Date;
  executionStartedAt?: Date;
  finalizedAt?: Date;
  deliveredAt?: Date;
}

export interface CreateServiceOrderData {
  customerId: string;
  vehicleId: string;
  services: ServiceOrderService[];
  parts: ServiceOrderPart[];
}

export interface IServiceOrderRepository {
  create(data: CreateServiceOrderData): Promise<ServiceOrder>;
  findById(id: string): Promise<ServiceOrder | null>;
  findAll(): Promise<ServiceOrder[]>;
  findAllActive(): Promise<ServiceOrder[]>;
  update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder>;
  updateStatus(
    id: string,
    status: ServiceOrderStatus,
    timestamps?: Partial<
      Pick<
        ServiceOrder,
        | 'diagnosisStartedAt'
        | 'executionStartedAt'
        | 'finalizedAt'
        | 'deliveredAt'
      >
    >,
  ): Promise<ServiceOrder>;
  getAverageExecutionTimeMinutes(): Promise<number>;
}

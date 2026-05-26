import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ServiceOrder,
  IServiceOrderRepository,
  CreateServiceOrderData,
} from '@/application/ports/service-order.repository.interface';
import { ServiceOrderStatus } from '@/domain/service-orders/service-order-status.enum';
import { NotFoundError } from '@/shared/errors/domain.error';

@Injectable()
export class ServiceOrderRepository implements IServiceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateServiceOrderData): Promise<ServiceOrder> {
    const totalCentsSnapshot = this.calculateTotal(data.services, data.parts);

    const created = await this.prisma.serviceOrder.create({
      data: {
        customerId: data.customerId,
        vehicleId: data.vehicleId,
        totalCentsSnapshot,
        services: {
          create: data.services.map((s) => ({
            serviceId: s.serviceId,
            quantity: s.quantity,
            unitPriceCentsSnapshot: s.unitPriceCentsSnapshot,
          })),
        },
        parts: {
          create: data.parts.map((p) => ({
            partId: p.partId,
            quantity: p.quantity,
            unitPriceCentsSnapshot: p.unitPriceCentsSnapshot,
          })),
        },
      },
      include: {
        services: true,
        parts: true,
      },
    });

    return this.mapToServiceOrder(created);
  }

  async findById(id: string): Promise<ServiceOrder | null> {
    const order = await this.prisma.serviceOrder.findUnique({
      where: { id },
      include: {
        services: true,
        parts: true,
      },
    });

    if (!order) return null;
    return this.mapToServiceOrder(order);
  }

  async findAll(): Promise<ServiceOrder[]> {
    const orders = await this.prisma.serviceOrder.findMany({
      include: {
        services: true,
        parts: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((o) => this.mapToServiceOrder(o));
  }

  async findAllActive(): Promise<ServiceOrder[]> {
    const statusOrder = [
      ServiceOrderStatus.InExecution,
      ServiceOrderStatus.AwaitingApproval,
      ServiceOrderStatus.InDiagnosis,
      ServiceOrderStatus.Received,
    ];

    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        status: {
          notIn: [ServiceOrderStatus.Finalized, ServiceOrderStatus.Delivered],
        },
      },
      include: {
        services: true,
        parts: true,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return orders
      .sort((a, b) => {
        const aIdx = statusOrder.indexOf(a.status as ServiceOrderStatus);
        const bIdx = statusOrder.indexOf(b.status as ServiceOrderStatus);
        if (aIdx !== bIdx) return aIdx - bIdx;
        return 0;
      })
      .map((o) => this.mapToServiceOrder(o));
  }

  async update(id: string, data: Partial<ServiceOrder>): Promise<ServiceOrder> {
    try {
      const updated = await this.prisma.serviceOrder.update({
        where: { id },
        data: {
          status: data.status,
          totalCentsSnapshot: data.totalCentsSnapshot,
          diagnosisStartedAt: data.diagnosisStartedAt,
          executionStartedAt: data.executionStartedAt,
          finalizedAt: data.finalizedAt,
          deliveredAt: data.deliveredAt,
        },
        include: {
          services: true,
          parts: true,
        },
      });

      return this.mapToServiceOrder(updated);
    } catch (error) {
      throw new NotFoundError('Service order not found');
    }
  }

  async updateStatus(
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
  ): Promise<ServiceOrder> {
    try {
      const updated = await this.prisma.serviceOrder.update({
        where: { id },
        data: {
          status,
          ...timestamps,
        },
        include: {
          services: true,
          parts: true,
        },
      });

      return this.mapToServiceOrder(updated);
    } catch (error) {
      throw new NotFoundError('Service order not found');
    }
  }

  async getAverageExecutionTimeMinutes(): Promise<number> {
    const orders = await this.prisma.serviceOrder.findMany({
      where: {
        status: {
          in: [ServiceOrderStatus.Finalized, ServiceOrderStatus.Delivered],
        },
        executionStartedAt: {
          not: null,
        },
        finalizedAt: {
          not: null,
        },
      },
      select: {
        executionStartedAt: true,
        finalizedAt: true,
      },
    });

    if (orders.length === 0) return 0;

    const totalMinutes = orders.reduce((sum, order) => {
      const start = order.executionStartedAt!.getTime();
      const end = order.finalizedAt!.getTime();
      const minutes = (end - start) / (1000 * 60);
      return sum + minutes;
    }, 0);

    return totalMinutes / orders.length;
  }

  private calculateTotal(
    services: { quantity: number; unitPriceCentsSnapshot: number }[],
    parts: { quantity: number; unitPriceCentsSnapshot: number }[],
  ): number {
    const servicesTotal = services.reduce(
      (sum, s) => sum + s.quantity * s.unitPriceCentsSnapshot,
      0,
    );
    const partsTotal = parts.reduce(
      (sum, p) => sum + p.quantity * p.unitPriceCentsSnapshot,
      0,
    );
    return servicesTotal + partsTotal;
  }

  private mapToServiceOrder(data: any): ServiceOrder {
    return {
      id: data.id,
      customerId: data.customerId,
      vehicleId: data.vehicleId,
      status: data.status as ServiceOrderStatus,
      totalCentsSnapshot: data.totalCentsSnapshot,
      services: data.services.map((s: any) => ({
        serviceId: s.serviceId,
        quantity: s.quantity,
        unitPriceCentsSnapshot: s.unitPriceCentsSnapshot,
      })),
      parts: data.parts.map((p: any) => ({
        partId: p.partId,
        quantity: p.quantity,
        unitPriceCentsSnapshot: p.unitPriceCentsSnapshot,
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      diagnosisStartedAt: data.diagnosisStartedAt,
      executionStartedAt: data.executionStartedAt,
      finalizedAt: data.finalizedAt,
      deliveredAt: data.deliveredAt,
    };
  }
}

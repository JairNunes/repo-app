import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Service,
  IServiceRepository,
} from '@/application/ports/service.repository.interface';
import { NotFoundError } from '@/shared/errors/domain.error';

@Injectable()
export class ServiceRepository implements IServiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name: string; priceCents: number }): Promise<Service> {
    return this.prisma.service.create({
      data,
    });
  }

  async findById(id: string): Promise<Service | null> {
    return this.prisma.service.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Service[]> {
    return this.prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: { name?: string; priceCents?: number },
  ): Promise<Service> {
    try {
      return await this.prisma.service.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundError('Service not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.service.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError('Service not found');
    }
  }
}

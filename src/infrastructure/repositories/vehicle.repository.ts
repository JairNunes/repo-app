import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Vehicle,
  IVehicleRepository,
} from '@/application/ports/vehicle.repository.interface';
import { NotFoundError } from '@/shared/errors/domain.error';

@Injectable()
export class VehicleRepository implements IVehicleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    customerId: string;
    plate: string;
    make: string;
    model: string;
    year: number;
  }): Promise<Vehicle> {
    return this.prisma.vehicle.create({
      data,
    });
  }

  async findByCustomerAndPlate(
    customerId: string,
    plate: string,
  ): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({
      where: {
        customerId_plate: {
          customerId,
          plate,
        },
      },
    });
  }

  async findById(id: string): Promise<Vehicle | null> {
    return this.prisma.vehicle.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Vehicle[]> {
    return this.prisma.vehicle.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: { make?: string; model?: string; year?: number },
  ): Promise<Vehicle> {
    try {
      return await this.prisma.vehicle.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundError('Vehicle not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.vehicle.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError('Vehicle not found');
    }
  }
}

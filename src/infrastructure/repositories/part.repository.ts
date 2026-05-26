import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Part,
  IPartRepository,
} from '@/application/ports/part.repository.interface';
import {
  NotFoundError,
  InsufficientStockError,
} from '@/shared/errors/domain.error';

@Injectable()
export class PartRepository implements IPartRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    name: string;
    priceCents: number;
    stockQuantity: number;
  }): Promise<Part> {
    return this.prisma.part.create({
      data,
    });
  }

  async findById(id: string): Promise<Part | null> {
    return this.prisma.part.findUnique({
      where: { id },
    });
  }

  async findAll(): Promise<Part[]> {
    return this.prisma.part.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: { name?: string; priceCents?: number; stockQuantity?: number },
  ): Promise<Part> {
    try {
      return await this.prisma.part.update({
        where: { id },
        data,
      });
    } catch (error) {
      throw new NotFoundError('Part not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.part.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError('Part not found');
    }
  }

  async decrementStock(partId: string, quantity: number): Promise<void> {
    const part = await this.findById(partId);
    if (!part) {
      throw new NotFoundError('Part not found');
    }

    if (part.stockQuantity < quantity) {
      throw new InsufficientStockError(part.name, quantity, part.stockQuantity);
    }

    await this.prisma.part.update({
      where: { id: partId },
      data: {
        stockQuantity: {
          decrement: quantity,
        },
      },
    });
  }
}

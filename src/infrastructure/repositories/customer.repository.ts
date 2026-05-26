import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  Customer,
  ICustomerRepository,
} from '@/application/ports/customer.repository.interface';
import { NotFoundError } from '@/shared/errors/domain.error';

@Injectable()
export class CustomerRepository implements ICustomerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { name?: string; document: string }): Promise<Customer> {
    const result = await this.prisma.customer.create({
      data: {
        name: data.name,
        document: data.document,
      },
    });
    return { ...result, name: result.name ?? undefined };
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const result = await this.prisma.customer.findUnique({
      where: { document },
    });
    return result ? { ...result, name: result.name ?? undefined } : null;
  }

  async findById(id: string): Promise<Customer | null> {
    const result = await this.prisma.customer.findUnique({
      where: { id },
    });
    return result ? { ...result, name: result.name ?? undefined } : null;
  }

  async findAll(): Promise<Customer[]> {
    const results = await this.prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return results.map((r) => ({ ...r, name: r.name ?? undefined }));
  }

  async update(id: string, data: { name?: string }): Promise<Customer> {
    try {
      const result = await this.prisma.customer.update({
        where: { id },
        data,
      });
      return { ...result, name: result.name ?? undefined };
    } catch (error) {
      throw new NotFoundError('Customer not found');
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.prisma.customer.delete({
        where: { id },
      });
    } catch (error) {
      throw new NotFoundError('Customer not found');
    }
  }
}

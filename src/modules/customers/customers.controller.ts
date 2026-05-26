import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ICustomerRepository } from '@/application/ports/customer.repository.interface';
import { ICustomerRepository as ICustomerToken } from '@/application/ports/tokens';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { Document } from '@/shared/validation/document.value-object';

@ApiTags('admin/customers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/customers')
export class CustomersController {
  constructor(
    @Inject(ICustomerToken)
    private readonly customerRepository: ICustomerRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create customer' })
  async create(@Body() dto: CreateCustomerDto) {
    const document = Document.create(dto.document);
    return this.customerRepository.create({
      document: document.getValue(),
      name: dto.name,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all customers' })
  async findAll() {
    return this.customerRepository.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id') id: string) {
    return this.customerRepository.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.customerRepository.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete customer' })
  async delete(@Param('id') id: string) {
    await this.customerRepository.delete(id);
    return { message: 'Customer deleted' };
  }
}

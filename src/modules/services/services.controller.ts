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
import { IServiceRepository } from '@/application/ports/service.repository.interface';
import { IServiceRepository as IServiceToken } from '@/application/ports/tokens';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';

@ApiTags('admin/services')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/services')
export class ServicesController {
  constructor(
    @Inject(IServiceToken)
    private readonly serviceRepository: IServiceRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create service' })
  async create(@Body() dto: CreateServiceDto) {
    return this.serviceRepository.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all services' })
  async findAll() {
    return this.serviceRepository.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get service by ID' })
  async findOne(@Param('id') id: string) {
    return this.serviceRepository.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update service' })
  async update(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.serviceRepository.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete service' })
  async delete(@Param('id') id: string) {
    await this.serviceRepository.delete(id);
    return { message: 'Service deleted' };
  }
}

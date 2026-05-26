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
import { IVehicleRepository } from '@/application/ports/vehicle.repository.interface';
import { IVehicleRepository as IVehicleToken } from '@/application/ports/tokens';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { Plate } from '@/shared/validation/plate.value-object';

@ApiTags('admin/vehicles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/vehicles')
export class VehiclesController {
  constructor(
    @Inject(IVehicleToken)
    private readonly vehicleRepository: IVehicleRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create vehicle' })
  async create(@Body() dto: CreateVehicleDto) {
    const plate = Plate.create(dto.plate);
    return this.vehicleRepository.create({
      customerId: dto.customerId,
      plate: plate.getValue(),
      make: dto.make,
      model: dto.model,
      year: dto.year,
    });
  }

  @Get()
  @ApiOperation({ summary: 'List all vehicles' })
  async findAll() {
    return this.vehicleRepository.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get vehicle by ID' })
  async findOne(@Param('id') id: string) {
    return this.vehicleRepository.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update vehicle' })
  async update(@Param('id') id: string, @Body() dto: UpdateVehicleDto) {
    return this.vehicleRepository.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete vehicle' })
  async delete(@Param('id') id: string) {
    await this.vehicleRepository.delete(id);
    return { message: 'Vehicle deleted' };
  }
}

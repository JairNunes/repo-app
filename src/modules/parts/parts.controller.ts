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
import { IPartRepository } from '@/application/ports/part.repository.interface';
import { IPartRepository as IPartToken } from '@/application/ports/tokens';
import { CreatePartDto } from './dto/create-part.dto';
import { UpdatePartDto } from './dto/update-part.dto';

@ApiTags('admin/parts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/parts')
export class PartsController {
  constructor(
    @Inject(IPartToken) private readonly partRepository: IPartRepository,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create part' })
  async create(@Body() dto: CreatePartDto) {
    return this.partRepository.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all parts' })
  async findAll() {
    return this.partRepository.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get part by ID' })
  async findOne(@Param('id') id: string) {
    return this.partRepository.findById(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update part' })
  async update(@Param('id') id: string, @Body() dto: UpdatePartDto) {
    return this.partRepository.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete part' })
  async delete(@Param('id') id: string) {
    await this.partRepository.delete(id);
    return { message: 'Part deleted' };
  }
}

import { Controller, Get, UseGuards, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { IServiceOrderRepository } from '@/application/ports/service-order.repository.interface';
import { IServiceOrderRepository as IServiceOrderToken } from '@/application/ports/tokens';

@ApiTags('admin/metrics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin/metrics')
export class MetricsController {
  constructor(
    @Inject(IServiceOrderToken)
    private readonly serviceOrderRepository: IServiceOrderRepository,
  ) {}

  @Get('average-execution-time')
  @ApiOperation({ summary: 'Get average execution time' })
  async getAverageExecutionTime() {
    const averageMinutes =
      await this.serviceOrderRepository.getAverageExecutionTimeMinutes();
    return {
      averageExecutionTimeMinutes: Math.round(averageMinutes * 100) / 100,
    };
  }
}

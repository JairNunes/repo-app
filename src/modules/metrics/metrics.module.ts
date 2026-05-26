import { Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { ServiceOrderRepository } from '@/infrastructure/repositories/service-order.repository';
import { IServiceOrderRepository } from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MetricsController],
  providers: [
    {
      provide: IServiceOrderRepository,
      useClass: ServiceOrderRepository,
    },
  ],
})
export class MetricsModule {}

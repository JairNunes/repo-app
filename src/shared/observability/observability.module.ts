import { Global, Module } from '@nestjs/common';
import { CustomMetricsService } from './custom-metrics.service';

@Global()
@Module({
  providers: [CustomMetricsService],
  exports: [CustomMetricsService],
})
export class ObservabilityModule {}

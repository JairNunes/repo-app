import { Module } from '@nestjs/common';
import { ServicesController } from './services.controller';
import { ServiceRepository } from '@/infrastructure/repositories/service.repository';
import { IServiceRepository } from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ServicesController],
  providers: [
    {
      provide: IServiceRepository,
      useClass: ServiceRepository,
    },
  ],
})
export class ServicesModule {}

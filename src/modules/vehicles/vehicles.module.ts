import { Module } from '@nestjs/common';
import { VehiclesController } from './vehicles.controller';
import { VehicleRepository } from '@/infrastructure/repositories/vehicle.repository';
import { IVehicleRepository } from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VehiclesController],
  providers: [
    {
      provide: IVehicleRepository,
      useClass: VehicleRepository,
    },
  ],
})
export class VehiclesModule {}

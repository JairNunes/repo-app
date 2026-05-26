import { Module } from '@nestjs/common';
import {
  ServiceOrdersController,
  PublicServiceOrdersController,
} from './service-orders.controller';
import { CreateServiceOrderUseCase } from '@/application/use-cases/create-service-order.use-case';
import { StartDiagnosisUseCase } from '@/application/use-cases/start-diagnosis.use-case';
import { SendForApprovalUseCase } from '@/application/use-cases/send-for-approval.use-case';
import { ApproveQuoteUseCase } from '@/application/use-cases/approve-quote.use-case';
import { RejectQuoteUseCase } from '@/application/use-cases/reject-quote.use-case';
import { FinalizeServiceOrderUseCase } from '@/application/use-cases/finalize-service-order.use-case';
import { DeliverServiceOrderUseCase } from '@/application/use-cases/deliver-service-order.use-case';
import { ListActiveServiceOrdersUseCase } from '@/application/use-cases/list-active-service-orders.use-case';
import { UpdateStatusExternalUseCase } from '@/application/use-cases/update-status-external.use-case';
import { CustomerRepository } from '@/infrastructure/repositories/customer.repository';
import { VehicleRepository } from '@/infrastructure/repositories/vehicle.repository';
import { ServiceRepository } from '@/infrastructure/repositories/service.repository';
import { PartRepository } from '@/infrastructure/repositories/part.repository';
import { ServiceOrderRepository } from '@/infrastructure/repositories/service-order.repository';
import {
  ICustomerRepository,
  IVehicleRepository,
  IServiceRepository,
  IPartRepository,
  IServiceOrderRepository,
} from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ServiceOrdersController, PublicServiceOrdersController],
  providers: [
    CreateServiceOrderUseCase,
    StartDiagnosisUseCase,
    SendForApprovalUseCase,
    ApproveQuoteUseCase,
    RejectQuoteUseCase,
    FinalizeServiceOrderUseCase,
    DeliverServiceOrderUseCase,
    ListActiveServiceOrdersUseCase,
    UpdateStatusExternalUseCase,
    {
      provide: ICustomerRepository,
      useClass: CustomerRepository,
    },
    {
      provide: IVehicleRepository,
      useClass: VehicleRepository,
    },
    {
      provide: IServiceRepository,
      useClass: ServiceRepository,
    },
    {
      provide: IPartRepository,
      useClass: PartRepository,
    },
    {
      provide: IServiceOrderRepository,
      useClass: ServiceOrderRepository,
    },
  ],
})
export class ServiceOrdersModule {}

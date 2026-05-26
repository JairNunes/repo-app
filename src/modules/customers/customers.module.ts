import { Module } from '@nestjs/common';
import { CustomersController } from './customers.controller';
import { CustomerRepository } from '@/infrastructure/repositories/customer.repository';
import { ICustomerRepository } from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomersController],
  providers: [
    {
      provide: ICustomerRepository,
      useClass: CustomerRepository,
    },
  ],
})
export class CustomersModule {}

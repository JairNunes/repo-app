import { Module } from '@nestjs/common';
import { PartsController } from './parts.controller';
import { PartRepository } from '@/infrastructure/repositories/part.repository';
import { IPartRepository } from '@/application/ports/tokens';
import { DatabaseModule } from '@/infrastructure/config/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PartsController],
  providers: [
    {
      provide: IPartRepository,
      useClass: PartRepository,
    },
  ],
})
export class PartsModule {}

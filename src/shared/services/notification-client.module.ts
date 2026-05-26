import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { NotificationClient } from './notification-client';

@Global()
@Module({
  imports: [HttpModule.register({ timeout: 5000, maxRedirects: 0 })],
  providers: [NotificationClient],
  exports: [NotificationClient],
})
export class NotificationClientModule {}

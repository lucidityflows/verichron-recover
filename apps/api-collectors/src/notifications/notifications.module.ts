import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationController } from './notifications.controller';
import { NotificationService } from './notifications.service';
import { Notification } from './entities';
import { OrganizationStatusChangedListener } from './listeners/organization-status-changed.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
  ],
  controllers: [NotificationController],
  providers: [NotificationService, OrganizationStatusChangedListener],
  exports: [NotificationService],
})
export class NotificationModule {}

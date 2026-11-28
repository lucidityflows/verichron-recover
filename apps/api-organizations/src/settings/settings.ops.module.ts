import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SettingsOpsController } from './settings.ops.controller';
import { SettingsOpsService } from './settings.ops.service';
import { Organization } from '../profiles/entities';
import { EventsModule } from '../events/events.module';

/**
 * Settings Ops Module
 *
 * Encapsulates all administrative settings logic.
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    EventsModule,
  ],
  controllers: [SettingsOpsController],
  providers: [SettingsOpsService],
  exports: [SettingsOpsService],
})
export class SettingsOpsModule {}

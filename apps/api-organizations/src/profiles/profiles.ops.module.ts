import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesOpsController } from './profiles.ops.controller';
import { ProfilesOpsService } from './profiles.ops.service';
import {
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
} from './entities';
import { EventsModule } from '../events/events.module';

/**
 * Profiles Ops Module
 *
 * Encapsulates all "Super Admin" organization management logic.
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationAddress,
      OrganizationEmail,
      OrganizationPhoneNumber,
    ]),
    EventsModule,
  ],
  controllers: [ProfilesOpsController],
  providers: [ProfilesOpsService],
  exports: [ProfilesOpsService],
})
export class ProfilesOpsModule {}

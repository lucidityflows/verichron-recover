import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesOpsController } from './profiles.ops.controller';
import { ProfilesOpsService } from './profiles.ops.service';
import { UserEntity, UserMembershipEntity, UserAddressEntity, UserEmailEntity, UserPhoneNumberEntity } from './entities';
import { RoleEntity } from '../rbac/entities/role.entity';
import { EventsModule } from '../events/event.module';

/**
 * Profiles Ops Module
 * 
 * Encapsulates all "Super Admin" user management logic.
 * Strictly separated from the tenant-facing ProfilesModule to prevent
 * accidental leakage of admin capabilities into tenant flows.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity, 
      UserMembershipEntity, 
      UserAddressEntity, 
      UserEmailEntity, 
      UserPhoneNumberEntity,
      RoleEntity
    ]),
    EventsModule // For publishing status change events
  ],
  controllers: [ProfilesOpsController],
  providers: [ProfilesOpsService],
  exports: [ProfilesOpsService],
})
export class ProfilesOpsModule {}

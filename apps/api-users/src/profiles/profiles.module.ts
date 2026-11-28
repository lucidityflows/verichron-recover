// src/profiles/profiles.module.ts
import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesPublicController } from './profiles.public.controller';
import { UsersInternalController } from './profiles.internal.controller';
import { ProfilesService } from './profiles.service';
import {
  UserEntity,
  UserMembershipEntity,
  UserAddressEntity,
  UserEmailEntity,
  UserPhoneNumberEntity,
} from './entities';
import { RbacModule } from '../rbac/rbac.module';
import {
  OrganizationNameChangedListener,
  OrganizationSuspendedListener,
  DebtorInvitationRequestedListener,
  DebtorInvitationBatchRequestedListener,
} from './listeners';
// OrganizationCreatedListener: Disabled - using synchronous orchestration for MVP
// Will re-enable for self-service trial provisioning in future

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      UserEmailEntity,
      UserMembershipEntity,
      UserAddressEntity,
      UserPhoneNumberEntity,
    ]),
    RbacModule,
  ],
  controllers: [ProfilesController, ProfilesPublicController, UsersInternalController],
  providers: [
    ProfilesService,
    // OrganizationCreatedListener, // Disabled for MVP - using sync orchestration instead
    OrganizationNameChangedListener,
    OrganizationSuspendedListener,
    DebtorInvitationRequestedListener,
    DebtorInvitationBatchRequestedListener,
    Logger,
  ],
  exports: [ProfilesService],
})
export class ProfilesModule {}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CollectorProfileController } from './profiles.controller';
import { ProfilesInternalController } from './profiles.internal.controller';
import { CollectorProfileService } from './collector-profile.service';
import { CollectorProfile } from './entities';
import { WorkQueueItem } from '../work-queue/entities';
import { AssignmentRegistryModule } from '../assignments/assignment-registry.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectorProfile,
      WorkQueueItem,
    ]),
    AssignmentRegistryModule,
  ],
  controllers: [CollectorProfileController, ProfilesInternalController],
  providers: [CollectorProfileService],
  exports: [CollectorProfileService],
})
export class CollectorProfileModule {}

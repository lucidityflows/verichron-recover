import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DemographicsController } from './demographics.controller';
import { DemographicsService } from './demographics.service';
import { DebtorDemographics } from './entities/debtor-demographics.entity';
import { ProfilesModule } from '../profiles/profiles.module';
import { EventsModule } from '../events';

/**
 * Demographics Module
 * 
 * Manages secure storage and access to sensitive debtor demographic data.
 * 
 * Key features:
 * - Strict access controls and permission checks
 * - Audit logging for all access (compliance requirement)
 * - Integration with ProfilesModule for debtor access verification
 * - Support for sparse data (all fields optional)
 * - 1:1 relationship with debtor profiles
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DebtorDemographics]),
    ProfilesModule, // Import to access ProfilesService for verification
    EventsModule
  ],
  controllers: [DemographicsController],
  providers: [DemographicsService],
  exports: [DemographicsService], // Export for use by other modules
})
export class DemographicsModule {}
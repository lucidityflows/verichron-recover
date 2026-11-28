import { Module, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorIdentityEntity } from './entities/debtor-identity.entity';
import { DebtorEmail } from '../profiles/entities/debtor-email.entity';
import { DebtorDemographics } from '../demographics/entities/debtor-demographics.entity';
import { DebtorProfileEntity } from '../profiles/entities/debtor-profile.entity';
import { DebtorIdentityService } from './identity.service';
import { DebtorUserCreatedListener, DebtorUserCreatedBatchListener } from './listeners';

/**
 * Identity Module
 *
 * SINGLE RESPONSIBILITY: Manage global debtor identities
 *
 * This module is the single source of truth for:
 * - Finding existing debtor identities (deduplication)
 * - Creating new debtor identities
 * - Linking/unlinking user accounts to identities
 * - Identity matching logic (email, SSN, etc.)
 *
 * Key Concepts:
 * - ONE DebtorIdentity per unique real-world person
 * - DebtorIdentity is organization-agnostic (global)
 * - Multiple DebtorProfiles can link to same identity (one per org)
 *
 * Used By:
 * - ProfilesModule: When creating new debtor profiles
 * - ImportsModule: During batch import processing
 * - Auth flows: When registered users log in
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DebtorIdentityEntity,
      DebtorEmail,
      DebtorDemographics,
      DebtorProfileEntity,
    ]),
  ],
  providers: [
    DebtorIdentityService,
    DebtorUserCreatedListener,
    DebtorUserCreatedBatchListener,
    Logger,
  ],
  exports: [DebtorIdentityService],
})
export class IdentityModule {}

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtorAddress } from '../profiles/entities/debtor-address.entity';
import { DebtorEmail } from '../profiles/entities/debtor-email.entity';
import { DebtorPhone } from '../profiles/entities/debtor-phone.entity';
import { DebtorProfileEntity } from '../profiles/entities/debtor-profile.entity';
import { DebtorAddressService } from './services/address.service';
import { DebtorEmailService } from './services/email.service';
import { DebtorPhoneService } from './services/phone.service';

/**
 * Contact Module
 *
 * SINGLE RESPONSIBILITY: Manage all contact information for debtor profiles
 *
 * This module handles:
 * - Address management (home, work, mailing, etc.)
 * - Email management (personal, work, etc.)
 * - Phone management (mobile, home, work, etc.)
 * - isPrimary logic for each contact type
 * - Verification status tracking
 *
 * Key Concepts:
 * - Contact info is PROFILE-SPECIFIC (organization-scoped)
 * - Each profile can have multiple addresses, emails, phones
 * - Only ONE primary contact of each type per profile
 * - Contact entities reference DebtorProfile (not DebtorIdentity)
 *
 * Used By:
 * - ProfilesModule: When creating/updating debtor profiles
 * - ImportsModule: During batch import processing
 * - VerificationsModule: When verifying contact information
 *
 * Example:
 * Diana Prince (DebtorIdentity) has:
 * - Profile in Stark Industries (DebtorProfile):
 *   - Address: "123 Main St, New York, NY"
 *   - Email: "diana@stark.com"
 *   - Phone: "555-0100"
 * - Profile in Wayne Enterprises (DebtorProfile):
 *   - Address: "456 Elm St, Gotham, NJ"
 *   - Email: "diana@wayne.com"
 *   - Phone: "555-0200"
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DebtorAddress,
      DebtorEmail,
      DebtorPhone,
      DebtorProfileEntity,
    ]),
  ],
  providers: [
    DebtorAddressService,
    DebtorEmailService,
    DebtorPhoneService,
  ],
  exports: [
    DebtorAddressService,
    DebtorEmailService,
    DebtorPhoneService,
  ],
})
export class ContactModule {}

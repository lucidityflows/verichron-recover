import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProfilesController } from './profiles.controller';
import { ProfilesService } from './profiles.service';
import { StickyAssignmentListener } from './listeners/sticky-assignment.listener';
import { DebtorProfileEntity } from './entities/debtor-profile.entity';
import { IdentityModule } from '../identity/identity.module';
import { ContactModule } from '../contact/contact.module';

/**
 * Profiles Module (Refactored & Streamlined)
 *
 * SINGLE RESPONSIBILITY: Manage debtor profiles (organization-scoped)
 *
 * This module handles:
 * - Core CRUD operations for DebtorProfile entity
 * - Organization context verification (multi-tenancy)
 * - Event publishing for profile lifecycle
 * - Delegation to IdentityModule for identity management
 * - Delegation to ContactModule for contact info management
 *
 * Module Dependencies:
 * - IdentityModule: For finding/creating DebtorIdentity
 * - ContactModule: For managing addresses, emails, phones
 * - EventsModule: For publishing profile events
 *
 * Key Concepts:
 * - DebtorProfile is ORGANIZATION-SCOPED (one per identity per org)
 * - ProfilesService verifies organization context via RequestContext
 * - Contact operations delegate to ContactModule services
 * - Identity operations delegate to IdentityService
 *
 * REST Endpoints:
 * - GET /debtors - List debtors for organization
 * - GET /debtors/:id - Get debtor details
 * - POST /debtors - Create debtor profile
 * - PUT /debtors/:id - Update debtor profile
 * - PATCH /debtors/:id - Partial update debtor profile
 * - DELETE /debtors/:id - Soft delete debtor profile
 * - Contact endpoints delegate to ContactModule
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([DebtorProfileEntity]),
    IdentityModule,
    ContactModule,
  ],
  controllers: [ProfilesController],
  providers: [ProfilesService, StickyAssignmentListener],
  exports: [ProfilesService], // Export for use by other modules (e.g., ImportsModule)
})
export class ProfilesModule {}
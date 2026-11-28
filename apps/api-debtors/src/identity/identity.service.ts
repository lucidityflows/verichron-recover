import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DebtorIdentityEntity } from './entities/debtor-identity.entity';
import { DebtorEmail } from '../profiles/entities/debtor-email.entity';
import { DebtorDemographics } from '../demographics/entities/debtor-demographics.entity';
import { DebtorProfileEntity } from '../profiles/entities/debtor-profile.entity';
import * as crypto from 'crypto';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorIdentityCreatedDto, DebtorUserLinkedDto } from '../events/event-dto';
import { plainToInstance } from 'class-transformer';

/**
 * DebtorIdentity Service
 *
 * SINGLE RESPONSIBILITY: Manage global debtor identities
 *
 * This service is the single source of truth for:
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
 * Example:
 * Diana Prince has:
 * - ONE DebtorIdentity (global - represents Diana as a unique person)
 * - TWO DebtorProfiles (one in Stark Industries, one in Wayne Enterprises)
 */
@Injectable()
export class DebtorIdentityService {
  private readonly logger = new Logger(DebtorIdentityService.name);

  constructor(
    @InjectRepository(DebtorIdentityEntity)
    private readonly identityRepository: Repository<DebtorIdentityEntity>,
    @InjectRepository(DebtorEmail)
    private readonly emailRepository: Repository<DebtorEmail>,
    @InjectRepository(DebtorDemographics)
    private readonly demographicsRepository: Repository<DebtorDemographics>,
    @InjectRepository(DebtorProfileEntity)
    private readonly profileRepository: Repository<DebtorProfileEntity>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Find or create a debtor identity based on matching criteria.
   *
   * Matching Strategy (MVP):
   * 1. If email provided → try email match (via userId lookup)
   * 2. If SSN provided → try SSN hash match (via demographics)
   * 3. If no match → create new identity
   *
   * Future: Add fuzzy matching (name + DOB + address)
   *
   * @param criteria - Identifying information
   * @returns Existing or newly created identity
   */
  async findOrCreateIdentity(criteria: {
    email?: string;
    ssnHash?: string;
    userId?: string;
  }): Promise<{ identity: DebtorIdentityEntity; isNew: boolean }> {
    // Try to find existing identity
    const existingIdentity = await this.findIdentityByMatchingCriteria(criteria);

    if (existingIdentity) {
      this.logger.log(`Found existing debtor identity: ${existingIdentity.id}`);
      return { identity: existingIdentity, isNew: false };
    }

    // Create new identity
    const newIdentity = this.identityRepository.create({
      userId: criteria.userId || null,
    });

    const savedIdentity = await this.identityRepository.save(newIdentity);

    this.logger.log(`Created new debtor identity: ${savedIdentity.id}`, {
      hasUserId: !!criteria.userId,
      matchedBy: 'new',
    });

    // Publish DebtorIdentityCreated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_IDENTITY_CREATED,
      {
        identityId: savedIdentity.id,
        userId: savedIdentity.userId ?? undefined,
        createdAt: savedIdentity.createdAt.toISOString(),
      },
      DebtorIdentityCreatedDto,
    );
    this.logger.log(`Published DebtorIdentityCreated event for ${savedIdentity.id}`);

    return { identity: savedIdentity, isNew: true };
  }

  /**
   * Find existing identity by matching criteria.
   *
   * MVP Matching Strategy (Exact Match Only):
   * 1. userId (if provided) - direct identity lookup
   * 2. SSN hash (if provided) - find profile via demographics, return its identity
   * 3. Email (if provided) - find profile via email contact, return its identity
   *
   * Order prioritizes most reliable identifiers first.
   * Returns null if no match found.
   */
  public async findIdentityByMatchingCriteria(criteria: {
    email?: string;
    ssnHash?: string;
    userId?: string;
  }): Promise<DebtorIdentityEntity | null> {
    // 1. Try userId direct match (most reliable)
    if (criteria.userId) {
      const identity = await this.identityRepository.findOne({
        where: { userId: criteria.userId },
      });

      if (identity) {
        this.logger.debug('Identity matched by userId', {
          identityId: identity.id,
          userId: criteria.userId,
        });
        return identity;
      }
    }

    // 2. Try SSN hash match via demographics (second most reliable)
    if (criteria.ssnHash) {
      const demographics = await this.demographicsRepository.findOne({
        where: { ssnHash: criteria.ssnHash },
        relations: ['debtorProfile', 'debtorProfile.debtorIdentity'],
      });

      if (demographics?.debtorProfile?.debtorIdentity) {
        this.logger.debug('Identity matched by SSN hash', {
          identityId: demographics.debtorProfile.debtorIdentity.id,
          ssnHash: criteria.ssnHash.substring(0, 8) + '...', // Log only prefix for security
        });
        return demographics.debtorProfile.debtorIdentity;
      }
    }

    // 3. Try email match via contact info (least reliable due to email changes)
    if (criteria.email) {
      const normalizedEmail = criteria.email.toLowerCase().trim();

      const emailRecord = await this.emailRepository.findOne({
        where: { email: normalizedEmail },
        relations: ['debtorProfile', 'debtorProfile.debtorIdentity'],
      });

      if (emailRecord?.debtorProfile?.debtorIdentity) {
        this.logger.debug('Identity matched by email', {
          identityId: emailRecord.debtorProfile.debtorIdentity.id,
          email: normalizedEmail,
        });
        return emailRecord.debtorProfile.debtorIdentity;
      }
    }

    // No match found
    return null;
  }

  /**
   * Link a user account to a debtor identity.
   *
   * Used when:
   * - A debtor registers and creates a user account
   * - We want to merge a debtor profile with an existing user
   *
   * @param identityId - The debtor identity to link
   * @param userId - The user account to link to
   */
  async linkUserToIdentity(
    identityId: string,
    userId: string,
  ): Promise<DebtorIdentityEntity> {
    const identity = await this.identityRepository.findOne({
      where: { id: identityId },
    });

    if (!identity) {
      throw new Error(`DebtorIdentity ${identityId} not found`);
    }

    if (identity.userId && identity.userId !== userId) {
      throw new Error(
        `DebtorIdentity ${identityId} is already linked to user ${identity.userId}`,
      );
    }

    identity.userId = userId;
    const updated = await this.identityRepository.save(identity);

    this.logger.log(`Linked user ${userId} to debtor identity ${identityId}`);

    // NOTE: This method does NOT publish an event because it lacks organization context.
    // Use linkUserToIdentityWithProfile() instead when you have organization context,
    // which will publish a complete DebtorUserLinked event.
    this.logger.warn(
      `linkUserToIdentity called without org context - event not published. ` +
      `Consider using linkUserToIdentityWithProfile() instead.`,
    );

    return updated;
  }

  /**
   * Link a user account to a debtor identity with organization context.
   *
   * This enhanced version includes the organization context to:
   * - Find the specific DebtorProfile for event publishing
   * - Publish complete event with debtorProfileId and organizationId
   *
   * Used in batch invitation flows where organization context is available.
   *
   * @param identityId - The debtor identity to link
   * @param userId - The user account to link to
   * @param organizationId - The organization context
   */
  async linkUserToIdentityWithProfile(
    identityId: string,
    userId: string,
    organizationId: string,
  ): Promise<DebtorIdentityEntity> {
    const identity = await this.identityRepository.findOne({
      where: { id: identityId },
    });

    if (!identity) {
      throw new Error(`DebtorIdentity ${identityId} not found`);
    }

    // Find the DebtorProfile for this identity in the specified organization
    const profile = await this.profileRepository.findOne({
      where: {
        debtorIdentityId: identityId,
        organizationId: organizationId,
      },
    });

    if (!profile) {
      throw new Error(
        `No DebtorProfile found for identity ${identityId} in organization ${organizationId}`,
      );
    }

    // Check if already linked to the same user (idempotency)
    if (identity.userId && identity.userId === userId) {
      this.logger.log(
        `Identity ${identityId} already linked to user ${userId} (idempotent)`,
      );

      // Still publish event for idempotency (consumers should handle duplicates)
      const eventDto = plainToInstance(DebtorUserLinkedDto, {
        debtorIdentityId: identity.id,
        debtorProfileId: profile.id,
        userId: userId,
        organizationId: organizationId,
        linkedAt: new Date().toISOString(),
      });

      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_USER_LINKED,
        {
          debtorIdentityId: identity.id,
          debtorProfileId: profile.id,
          userId: userId,
          organizationId: organizationId,
          linkedAt: new Date().toISOString(),
        },
        DebtorUserLinkedDto,
      );

      return identity;
    }

    // Check if already linked to a different user
    if (identity.userId && identity.userId !== userId) {
      throw new Error(
        `DebtorIdentity ${identityId} is already linked to user ${identity.userId}`,
      );
    }

    identity.userId = userId;
    const updated = await this.identityRepository.save(identity);

    this.logger.log(
      `Linked user ${userId} to debtor identity ${identityId} in organization ${organizationId} (profile ${profile.id})`,
    );

    // Publish complete DebtorUserLinked event with all required fields
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_USER_LINKED,
      {
        debtorIdentityId: updated.id,
        debtorProfileId: profile.id,
        userId: updated.userId!,
        organizationId: organizationId,
        linkedAt: new Date().toISOString(),
      },
      DebtorUserLinkedDto,
    );
    this.logger.log(
      `Published DebtorUserLinked event for identity ${updated.id} (profile ${profile.id} in org ${organizationId})`,
    );

    return updated;
  }

  /**
   * Unlink a user account from a debtor identity.
   *
   * Used when:
   * - A user deletes their account but debtor profile should remain
   * - Manual de-linkage by admin
   */
  async unlinkUserFromIdentity(identityId: string): Promise<DebtorIdentityEntity> {
    const identity = await this.identityRepository.findOne({
      where: { id: identityId },
    });

    if (!identity) {
      throw new Error(`DebtorIdentity ${identityId} not found`);
    }

    const previousUserId = identity.userId;
    identity.userId = null;

    const updated = await this.identityRepository.save(identity);

    this.logger.log(`Unlinked user ${previousUserId} from debtor identity ${identityId}`);

    return updated;
  }

  /**
   * Find identity by user ID.
   *
   * Used when a registered user logs in and we need to find their debtor profiles.
   */
  async findIdentityByUserId(userId: string): Promise<DebtorIdentityEntity | null> {
    return this.identityRepository.findOne({
      where: { userId },
      relations: ['profiles'], // Load org-specific profiles
    });
  }

  /**
   * Find identity by ID with profiles loaded.
   */
  async findIdentityWithProfiles(identityId: string): Promise<DebtorIdentityEntity | null> {
    return this.identityRepository.findOne({
      where: { id: identityId },
      relations: ['profiles'],
    });
  }

  /**
   * Generate deterministic debtor key for idempotency.
   *
   * Used for deduplication during import processing.
   * Same debtor data always generates same key.
   *
   * @param data - Debtor identifying data
   * @returns Hash-based key
   */
  generateDebtorKey(data: {
    organizationId: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    dateOfBirth?: string;
  }): string {
    // If email provided, use it as primary key
    if (data.email) {
      return `${data.organizationId}:email:${data.email.toLowerCase().trim()}`;
    }

    // Otherwise use name + DOB combination
    const components = [
      data.organizationId,
      data.firstName?.toLowerCase().trim() || '',
      data.lastName?.toLowerCase().trim() || '',
      data.dateOfBirth || '',
    ];

    const combined = components.join(':');
    const hash = crypto.createHash('sha256').update(combined).digest('hex');

    return `${data.organizationId}:hash:${hash.substring(0, 16)}`;
  }

  /**
   * Generate SSN hash for secure matching.
   *
   * @param ssn - Full SSN (9 digits, no dashes)
   * @returns SHA-256 hash of SSN
   */
  generateSsnHash(ssn: string): string {
    // Remove any non-digit characters
    const cleanSsn = ssn.replace(/\D/g, '');

    if (cleanSsn.length !== 9) {
      throw new Error('SSN must be exactly 9 digits');
    }

    return crypto.createHash('sha256').update(cleanSsn).digest('hex');
  }
}

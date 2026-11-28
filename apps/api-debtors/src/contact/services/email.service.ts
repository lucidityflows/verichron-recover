import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { EmailCategory } from '@verichron/enums/dist';
import { EventPublisher } from '@verichron/event-publisher';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DebtorEmail } from '../../profiles/entities/debtor-email.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorEmailUpdatedDto } from '../../events/event-dto/debtors/debtor-email-updated.dto';
import { DuplicateEmailException } from '../../profiles/errors';

/**
 * Debtor Email Service
 *
 * SINGLE RESPONSIBILITY: Manage debtor email addresses
 *
 * This service handles:
 * - CRUD operations for DebtorEmail entities
 * - isPrimary logic (ensuring only one primary email per profile)
 * - Email uniqueness validation within a profile
 * - Email verification status tracking
 *
 * Dependencies:
 * - ProfilesModule: To verify DebtorProfile existence
 */
@Injectable()
export class DebtorEmailService {
  private readonly logger = new Logger(DebtorEmailService.name);

  constructor(
    @InjectRepository(DebtorEmail)
    private readonly emailRepository: Repository<DebtorEmail>,
    @InjectRepository(DebtorProfileEntity)
    private readonly profileRepository: Repository<DebtorProfileEntity>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new email for a debtor profile.
   *
   * If isPrimary is true, automatically unsets any existing primary email.
   * Validates that email doesn't already exist for this profile.
   *
   * @param debtorProfileId - The debtor profile this email belongs to
   * @param emailData - Email information
   * @returns Created email
   */
  async create(
    debtorProfileId: string,
    emailData: {
      email: string;
      emailCategory?: EmailCategory;
      isPrimary?: boolean;
    },
  ): Promise<DebtorEmail> {
    // Check for duplicate email within this profile
    const existing = await this.emailRepository.findOne({
      where: {
        debtorProfileId,
        email: emailData.email.toLowerCase().trim(),
      },
    });

    if (existing) {
      throw new DuplicateEmailException(emailData.email, debtorProfileId);
    }

    // If setting as primary, unset existing primary
    if (emailData.isPrimary) {
      await this.unsetPrimaryEmail(debtorProfileId);
    }

    const email = this.emailRepository.create({
      debtorProfileId,
      email: emailData.email.toLowerCase().trim(),
      emailCategory: emailData.emailCategory,
      isPrimary: emailData.isPrimary || false,
      isVerified: false,
    });

    const saved = await this.emailRepository.save(email);

    this.logger.log(`Created email for debtor profile ${debtorProfileId}`, {
      emailId: saved.id,
      isPrimary: saved.isPrimary,
    });

    // Publish DebtorEmailUpdated event
    await this.publishEmailUpdatedEvent(saved);

    return saved;
  }

  /**
   * Find all emails for a debtor profile.
   *
   * Optimized query that verifies organization access via join in single query.
   *
   * @param debtorProfileId - The debtor profile ID
   * @param organizationId - Organization ID for access verification
   * @returns Array of emails (primary first if exists)
   */
  async findByProfile(
    debtorProfileId: string,
    organizationId?: string,
  ): Promise<DebtorEmail[]> {
    // If organizationId provided, use optimized join query for access verification
    if (organizationId) {
      return this.emailRepository
        .createQueryBuilder('email')
        .innerJoin('email.debtorProfile', 'profile')
        .where('email.debtorProfileId = :debtorProfileId', { debtorProfileId })
        .andWhere('profile.organizationId = :organizationId', { organizationId })
        .orderBy('email.isPrimary', 'DESC')
        .addOrderBy('email.createdAt', 'DESC')
        .getMany();
    }

    // Fallback for internal use without org check
    return this.emailRepository.find({
      where: { debtorProfileId },
      order: {
        isPrimary: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find primary email for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   * @returns Primary email or null
   */
  async findPrimary(debtorProfileId: string): Promise<DebtorEmail | null> {
    return this.emailRepository.findOne({
      where: { debtorProfileId, isPrimary: true },
    });
  }

  /**
   * Find email by ID.
   *
   * @param id - Email ID
   * @returns Email or null
   */
  async findById(id: string): Promise<DebtorEmail | null> {
    return this.emailRepository.findOne({
      where: { id },
    });
  }

  /**
   * Update an email.
   *
   * If setting as primary, automatically unsets any existing primary email.
   * If changing email address, validates uniqueness within profile.
   *
   * @param id - Email ID
   * @param updateData - Fields to update
   * @returns Updated email
   */
  async update(
    id: string,
    updateData: Partial<{
      email: string;
      emailCategory: EmailCategory;
      isPrimary: boolean;
      isVerified: boolean;
    }>,
  ): Promise<DebtorEmail> {
    const email = await this.emailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email ${id} not found`);
    }

    // If changing email address, check for duplicates
    if (updateData.email && updateData.email !== email.email) {
      const duplicate = await this.emailRepository.findOne({
        where: {
          debtorProfileId: email.debtorProfileId,
          email: updateData.email.toLowerCase().trim(),
        },
      });

      if (duplicate) {
        throw new DuplicateEmailException(updateData.email, email.debtorProfileId);
      }

      // Normalize email
      updateData.email = updateData.email.toLowerCase().trim();
    }

    // If setting as primary, unset existing primary
    if (updateData.isPrimary && !email.isPrimary) {
      await this.unsetPrimaryEmail(email.debtorProfileId);
    }

    Object.assign(email, updateData);

    const updated = await this.emailRepository.save(email);

    this.logger.log(`Updated email ${id}`, {
      debtorProfileId: email.debtorProfileId,
      isPrimary: updated.isPrimary,
    });

    // Publish DebtorEmailUpdated event
    await this.publishEmailUpdatedEvent(updated);

    return updated;
  }

  /**
   * Delete an email.
   *
   * @param id - Email ID
   */
  async delete(id: string): Promise<void> {
    const email = await this.emailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email ${id} not found`);
    }

    await this.emailRepository.remove(email);

    this.logger.log(`Deleted email ${id}`, {
      debtorProfileId: email.debtorProfileId,
    });

    // Publish DebtorEmailUpdated event (email deleted)
    await this.publishEmailUpdatedEvent(email);
  }

  /**
   * Find the debtor identity ID associated with an email.
   * Checks across ALL profiles in ALL organizations.
   *
   * @param email - Email to check
   * @returns Debtor identity ID or null
   */
  async findIdentityByEmail(email: string): Promise<string | null> {
    const record = await this.emailRepository
      .createQueryBuilder('email')
      .innerJoinAndSelect('email.debtorProfile', 'profile')
      .where('email.email = :email', { email: email.toLowerCase().trim() })
      .getOne();

    return record?.debtorProfile?.debtorIdentityId || null;
  }

  /**
   * Set an email as primary.
   *
   * Automatically unsets any existing primary email for the profile.
   *
   * @param id - Email ID to set as primary
   * @returns Updated email
   */
  async setPrimary(id: string): Promise<DebtorEmail> {
    const email = await this.emailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email ${id} not found`);
    }

    if (email.isPrimary) {
      return email; // Already primary
    }

    // Unset existing primary
    await this.unsetPrimaryEmail(email.debtorProfileId);

    // Set this one as primary
    email.isPrimary = true;
    const updated = await this.emailRepository.save(email);

    this.logger.log(`Set email ${id} as primary for debtor profile ${email.debtorProfileId}`);

    // Publish DebtorEmailUpdated event
    await this.publishEmailUpdatedEvent(updated);

    return updated;
  }

  /**
   * Mark an email as verified.
   *
   * @param id - Email ID
   * @param verifiedAt - Verification timestamp (defaults to now)
   * @returns Updated email
   */
  async markVerified(id: string, verifiedAt?: Date): Promise<DebtorEmail> {
    const email = await this.emailRepository.findOne({
      where: { id },
    });

    if (!email) {
      throw new NotFoundException(`Email ${id} not found`);
    }

    email.isVerified = true;
    email.verifiedAt = verifiedAt || new Date();

    const updated = await this.emailRepository.save(email);

    this.logger.log(`Marked email ${id} as verified`, {
      debtorProfileId: email.debtorProfileId,
    });

    // Publish DebtorEmailUpdated event
    await this.publishEmailUpdatedEvent(updated);

    return updated;
  }

  /**
   * Unset the primary email for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   */
  private async unsetPrimaryEmail(debtorProfileId: string): Promise<void> {
    await this.emailRepository.update(
      { debtorProfileId, isPrimary: true },
      { isPrimary: false },
    );
  }

  /**
   * Publish DebtorEmailUpdated event.
   *
   * @param email - The email entity
   */
  private async publishEmailUpdatedEvent(email: DebtorEmail): Promise<void> {
    // Get organization ID from profile
    const profile = await this.profileRepository.findOne({
      where: { id: email.debtorProfileId },
      select: ['organizationId'],
    });

    if (!profile) {
      this.logger.warn(`Profile ${email.debtorProfileId} not found, skipping event publishing`);
      return;
    }

    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_PROFILE_EMAIL_UPDATED,
      {
        debtorProfileId: email.debtorProfileId,
        emailId: email.id,
        organizationId: profile.organizationId,
        updatedAt: new Date().toISOString(),
        isPrimary: email.isPrimary,
      },
      DebtorEmailUpdatedDto,
    );

    this.logger.log(`Published DebtorEmailUpdated event for email ${email.id}`);
  }
}

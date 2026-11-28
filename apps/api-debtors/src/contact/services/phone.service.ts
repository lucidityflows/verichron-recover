import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { PhoneCategory } from '@verichron/enums/dist';
import { EventPublisher } from '@verichron/event-publisher';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DebtorPhone } from '../../profiles/entities/debtor-phone.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorPhoneUpdatedDto } from '../../events/event-dto/debtors/debtor-phone-updated.dto';

/**
 * Debtor Phone Service
 *
 * SINGLE RESPONSIBILITY: Manage debtor phone numbers
 *
 * This service handles:
 * - CRUD operations for DebtorPhone entities
 * - isPrimary logic (ensuring only one primary phone per profile)
 * - Phone number uniqueness validation within a profile
 * - Phone verification status tracking
 *
 * Dependencies:
 * - ProfilesModule: To verify DebtorProfile existence
 */
@Injectable()
export class DebtorPhoneService {
  private readonly logger = new Logger(DebtorPhoneService.name);

  constructor(
    @InjectRepository(DebtorPhone)
    private readonly phoneRepository: Repository<DebtorPhone>,
    @InjectRepository(DebtorProfileEntity)
    private readonly profileRepository: Repository<DebtorProfileEntity>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new phone number for a debtor profile.
   *
   * If isPrimary is true, automatically unsets any existing primary phone.
   * Validates that phone doesn't already exist for this profile.
   *
   * @param debtorProfileId - The debtor profile this phone belongs to
   * @param phoneData - Phone information
   * @returns Created phone
   */
  async create(
    debtorProfileId: string,
    phoneData: {
      phoneNumber: string;
      category?: PhoneCategory;
      isPrimary?: boolean;
    },
  ): Promise<DebtorPhone> {
    // Normalize phone number (remove all non-digits)
    const normalizedPhone = phoneData.phoneNumber.replace(/\D/g, '');

    // Check for duplicate phone within this profile
    const existing = await this.phoneRepository.findOne({
      where: {
        debtorProfileId,
        phoneNumber: normalizedPhone,
      },
    });

    if (existing) {
      throw new ConflictException(
        `Phone number ${phoneData.phoneNumber} already exists for this debtor profile`,
      );
    }

    // If setting as primary, unset existing primary
    if (phoneData.isPrimary) {
      await this.unsetPrimaryPhone(debtorProfileId);
    }

    const phone = this.phoneRepository.create({
      debtorProfileId,
      phoneNumber: normalizedPhone,
      category: phoneData.category,
      isPrimary: phoneData.isPrimary || false,
      isVerified: false,
    });

    const saved = await this.phoneRepository.save(phone);

    this.logger.log(`Created phone for debtor profile ${debtorProfileId}`, {
      phoneId: saved.id,
      isPrimary: saved.isPrimary,
    });

    // Publish DebtorPhoneUpdated event
    await this.publishPhoneUpdatedEvent(saved);

    return saved;
  }

  /**
   * Find all phone numbers for a debtor profile.
   *
   * Optimized query that verifies organization access via join in single query.
   *
   * @param debtorProfileId - The debtor profile ID
   * @param organizationId - Organization ID for access verification
   * @returns Array of phones (primary first if exists)
   */
  async findByProfile(
    debtorProfileId: string,
    organizationId?: string,
  ): Promise<DebtorPhone[]> {
    // If organizationId provided, use optimized join query for access verification
    if (organizationId) {
      return this.phoneRepository
        .createQueryBuilder('phone')
        .innerJoin('phone.debtorProfile', 'profile')
        .where('phone.debtorProfileId = :debtorProfileId', { debtorProfileId })
        .andWhere('profile.organizationId = :organizationId', { organizationId })
        .orderBy('phone.isPrimary', 'DESC')
        .addOrderBy('phone.createdAt', 'DESC')
        .getMany();
    }

    // Fallback for internal use without org check
    return this.phoneRepository.find({
      where: { debtorProfileId },
      order: {
        isPrimary: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find primary phone for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   * @returns Primary phone or null
   */
  async findPrimary(debtorProfileId: string): Promise<DebtorPhone | null> {
    return this.phoneRepository.findOne({
      where: { debtorProfileId, isPrimary: true },
    });
  }

  /**
   * Find phone by ID.
   *
   * @param id - Phone ID
   * @returns Phone or null
   */
  async findById(id: string): Promise<DebtorPhone | null> {
    return this.phoneRepository.findOne({
      where: { id },
    });
  }

  /**
   * Update a phone number.
   *
   * If setting as primary, automatically unsets any existing primary phone.
   * If changing phone number, validates uniqueness within profile.
   *
   * @param id - Phone ID
   * @param updateData - Fields to update
   * @returns Updated phone
   */
  async update(
    id: string,
    updateData: Partial<{
      phoneNumber: string;
      category: PhoneCategory;
      isPrimary: boolean;
      isVerified: boolean;
    }>,
  ): Promise<DebtorPhone> {
    const phone = await this.phoneRepository.findOne({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException(`Phone ${id} not found`);
    }

    // If changing phone number, check for duplicates
    if (updateData.phoneNumber) {
      const normalizedPhone = updateData.phoneNumber.replace(/\D/g, '');

      if (normalizedPhone !== phone.phoneNumber) {
        const duplicate = await this.phoneRepository.findOne({
          where: {
            debtorProfileId: phone.debtorProfileId,
            phoneNumber: normalizedPhone,
          },
        });

        if (duplicate) {
          throw new ConflictException(
            `Phone number ${updateData.phoneNumber} already exists for this debtor profile`,
          );
        }

        updateData.phoneNumber = normalizedPhone;
      }
    }

    // If setting as primary, unset existing primary
    if (updateData.isPrimary && !phone.isPrimary) {
      await this.unsetPrimaryPhone(phone.debtorProfileId);
    }

    Object.assign(phone, updateData);

    const updated = await this.phoneRepository.save(phone);

    this.logger.log(`Updated phone ${id}`, {
      debtorProfileId: phone.debtorProfileId,
      isPrimary: updated.isPrimary,
    });

    // Publish DebtorPhoneUpdated event
    await this.publishPhoneUpdatedEvent(updated);

    return updated;
  }

  /**
   * Delete a phone number.
   *
   * @param id - Phone ID
   */
  async delete(id: string): Promise<void> {
    const phone = await this.phoneRepository.findOne({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException(`Phone ${id} not found`);
    }

    await this.phoneRepository.remove(phone);

    this.logger.log(`Deleted phone ${id}`, {
      debtorProfileId: phone.debtorProfileId,
    });

    // Publish DebtorPhoneUpdated event (phone deleted)
    await this.publishPhoneUpdatedEvent(phone);
  }

  /**
   * Set a phone as primary.
   *
   * Automatically unsets any existing primary phone for the profile.
   *
   * @param id - Phone ID to set as primary
   * @returns Updated phone
   */
  async setPrimary(id: string): Promise<DebtorPhone> {
    const phone = await this.phoneRepository.findOne({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException(`Phone ${id} not found`);
    }

    if (phone.isPrimary) {
      return phone; // Already primary
    }

    // Unset existing primary
    await this.unsetPrimaryPhone(phone.debtorProfileId);

    // Set this one as primary
    phone.isPrimary = true;
    const updated = await this.phoneRepository.save(phone);

    this.logger.log(`Set phone ${id} as primary for debtor profile ${phone.debtorProfileId}`);

    // Publish DebtorPhoneUpdated event
    await this.publishPhoneUpdatedEvent(updated);

    return updated;
  }

  /**
   * Mark a phone as verified.
   *
   * @param id - Phone ID
   * @param verifiedAt - Verification timestamp (defaults to now)
   * @returns Updated phone
   */
  async markVerified(id: string, verifiedAt?: Date): Promise<DebtorPhone> {
    const phone = await this.phoneRepository.findOne({
      where: { id },
    });

    if (!phone) {
      throw new NotFoundException(`Phone ${id} not found`);
    }

    phone.isVerified = true;
    phone.verifiedAt = verifiedAt || new Date();

    const updated = await this.phoneRepository.save(phone);

    this.logger.log(`Marked phone ${id} as verified`, {
      debtorProfileId: phone.debtorProfileId,
    });

    // Publish DebtorPhoneUpdated event
    await this.publishPhoneUpdatedEvent(updated);

    return updated;
  }

  /**
   * Unset the primary phone for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   */
  private async unsetPrimaryPhone(debtorProfileId: string): Promise<void> {
    await this.phoneRepository.update(
      { debtorProfileId, isPrimary: true },
      { isPrimary: false },
    );
  }

  /**
   * Publish DebtorPhoneUpdated event.
   *
   * @param phone - The phone entity
   */
  private async publishPhoneUpdatedEvent(phone: DebtorPhone): Promise<void> {
    // Get organization ID from profile
    const profile = await this.profileRepository.findOne({
      where: { id: phone.debtorProfileId },
      select: ['organizationId'],
    });

    if (!profile) {
      this.logger.warn(`Profile ${phone.debtorProfileId} not found, skipping event publishing`);
      return;
    }

    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_PROFILE_PHONE_UPDATED,
      {
        debtorProfileId: phone.debtorProfileId,
        phoneId: phone.id,
        organizationId: profile.organizationId,
        updatedAt: new Date().toISOString(),
        isPrimary: phone.isPrimary,
      },
      DebtorPhoneUpdatedDto,
    );

    this.logger.log(`Published DebtorPhoneUpdated event for phone ${phone.id}`);
  }
}

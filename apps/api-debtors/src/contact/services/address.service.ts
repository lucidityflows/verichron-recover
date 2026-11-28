import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENT_TOPICS, EVENT_TYPES } from '@verichron/events';
import { AddressCategory } from '@verichron/enums/dist';
import { EventPublisher } from '@verichron/event-publisher';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DebtorAddress } from '../../profiles/entities/debtor-address.entity';
import { DebtorProfileEntity } from '../../profiles/entities/debtor-profile.entity';
import { DebtorAddressUpdatedDto } from '../../events/event-dto/debtors/debtor-address-updated.dto';

/**
 * Debtor Address Service
 *
 * SINGLE RESPONSIBILITY: Manage debtor address information
 *
 * This service handles:
 * - CRUD operations for DebtorAddress entities
 * - isPrimary logic (ensuring only one primary address per profile)
 * - Address validation and standardization
 *
 * Dependencies:
 * - ProfilesModule: To verify DebtorProfile existence
 */
@Injectable()
export class DebtorAddressService {
  private readonly logger = new Logger(DebtorAddressService.name);

  constructor(
    @InjectRepository(DebtorAddress)
    private readonly addressRepository: Repository<DebtorAddress>,
    @InjectRepository(DebtorProfileEntity)
    private readonly profileRepository: Repository<DebtorProfileEntity>,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new address for a debtor profile.
   *
   * If isPrimary is true, automatically unsets any existing primary address.
   *
   * @param debtorProfileId - The debtor profile this address belongs to
   * @param addressData - Address information
   * @returns Created address
   */
  async create(
    debtorProfileId: string,
    addressData: {
      street1: string;
      street2?: string;
      city: string;
      state: string;
      postalCode: string;
      country?: string;
      addressCategory?: AddressCategory;
      isPrimary?: boolean;
    },
  ): Promise<DebtorAddress> {
    // If setting as primary, unset existing primary
    if (addressData.isPrimary) {
      await this.unsetPrimaryAddress(debtorProfileId);
    }

    const address = this.addressRepository.create({
      debtorProfileId,
      street1: addressData.street1,
      street2: addressData.street2,
      city: addressData.city,
      state: addressData.state,
      postalCode: addressData.postalCode,
      country: addressData.country || 'USA',
      addressCategory: addressData.addressCategory,
      isPrimary: addressData.isPrimary || false,
    });

    const saved = await this.addressRepository.save(address);

    this.logger.log(`Created address for debtor profile ${debtorProfileId}`, {
      addressId: saved.id,
      isPrimary: saved.isPrimary,
    });

    // Publish DebtorAddressUpdated event
    await this.publishAddressUpdatedEvent(saved);

    return saved;
  }

  /**
   * Find all addresses for a debtor profile.
   *
   * Optimized query that verifies organization access via join in single query.
   *
   * @param debtorProfileId - The debtor profile ID
   * @param organizationId - Organization ID for access verification
   * @returns Array of addresses (primary first if exists)
   */
  async findByProfile(
    debtorProfileId: string,
    organizationId?: string,
  ): Promise<DebtorAddress[]> {
    // If organizationId provided, use optimized join query for access verification
    if (organizationId) {
      return this.addressRepository
        .createQueryBuilder('address')
        .innerJoin('address.debtorProfile', 'profile')
        .where('address.debtorProfileId = :debtorProfileId', { debtorProfileId })
        .andWhere('profile.organizationId = :organizationId', { organizationId })
        .orderBy('address.isPrimary', 'DESC')
        .addOrderBy('address.createdAt', 'DESC')
        .getMany();
    }

    // Fallback for internal use without org check
    return this.addressRepository.find({
      where: { debtorProfileId },
      order: {
        isPrimary: 'DESC',
        createdAt: 'DESC',
      },
    });
  }

  /**
   * Find primary address for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   * @returns Primary address or null
   */
  async findPrimary(debtorProfileId: string): Promise<DebtorAddress | null> {
    return this.addressRepository.findOne({
      where: { debtorProfileId, isPrimary: true },
    });
  }

  /**
   * Find address by ID.
   *
   * @param id - Address ID
   * @returns Address or null
   */
  async findById(id: string): Promise<DebtorAddress | null> {
    return this.addressRepository.findOne({
      where: { id },
    });
  }

  /**
   * Update an address.
   *
   * If setting as primary, automatically unsets any existing primary address.
   *
   * @param id - Address ID
   * @param updateData - Fields to update
   * @returns Updated address
   */
  async update(
    id: string,
    updateData: Partial<{
      street1: string;
      street2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      addressCategory: AddressCategory;
      isPrimary: boolean;
    }>,
  ): Promise<DebtorAddress> {
    const address = await this.addressRepository.findOne({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }

    // If setting as primary, unset existing primary
    if (updateData.isPrimary && !address.isPrimary) {
      await this.unsetPrimaryAddress(address.debtorProfileId);
    }

    Object.assign(address, updateData);

    const updated = await this.addressRepository.save(address);

    this.logger.log(`Updated address ${id}`, {
      debtorProfileId: address.debtorProfileId,
      isPrimary: updated.isPrimary,
    });

    // Publish DebtorAddressUpdated event
    await this.publishAddressUpdatedEvent(updated);

    return updated;
  }

  /**
   * Delete an address.
   *
   * @param id - Address ID
   */
  async delete(id: string): Promise<void> {
    const address = await this.addressRepository.findOne({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }

    await this.addressRepository.remove(address);

    this.logger.log(`Deleted address ${id}`, {
      debtorProfileId: address.debtorProfileId,
    });

    // Publish DebtorAddressUpdated event (address deleted)
    await this.publishAddressUpdatedEvent(address);
  }

  /**
   * Set an address as primary.
   *
   * Automatically unsets any existing primary address for the profile.
   *
   * @param id - Address ID to set as primary
   * @returns Updated address
   */
  async setPrimary(id: string): Promise<DebtorAddress> {
    const address = await this.addressRepository.findOne({
      where: { id },
    });

    if (!address) {
      throw new NotFoundException(`Address ${id} not found`);
    }

    if (address.isPrimary) {
      return address; // Already primary
    }

    // Unset existing primary
    await this.unsetPrimaryAddress(address.debtorProfileId);

    // Set this one as primary
    address.isPrimary = true;
    const updated = await this.addressRepository.save(address);

    this.logger.log(`Set address ${id} as primary for debtor profile ${address.debtorProfileId}`);

    // Publish DebtorAddressUpdated event
    await this.publishAddressUpdatedEvent(updated);

    return updated;
  }

  /**
   * Unset the primary address for a debtor profile.
   *
   * @param debtorProfileId - The debtor profile ID
   */
  private async unsetPrimaryAddress(debtorProfileId: string): Promise<void> {
    await this.addressRepository.update(
      { debtorProfileId, isPrimary: true },
      { isPrimary: false },
    );
  }

  /**
   * Publish DebtorAddressUpdated event.
   *
   * @param address - The address entity
   */
  private async publishAddressUpdatedEvent(address: DebtorAddress): Promise<void> {
    // Get organization ID from profile
    const profile = await this.profileRepository.findOne({
      where: { id: address.debtorProfileId },
      select: ['organizationId'],
    });

    if (!profile) {
      this.logger.warn(`Profile ${address.debtorProfileId} not found, skipping event publishing`);
      return;
    }

    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_PROFILE_ADDRESS_UPDATED,
      {
        debtorProfileId: address.debtorProfileId,
        addressId: address.id,
        organizationId: profile.organizationId,
        updatedAt: new Date().toISOString(),
        isPrimary: address.isPrimary,
      },
      DebtorAddressUpdatedDto,
    );

    this.logger.log(`Published DebtorAddressUpdated event for address ${address.id}`);
  }
}

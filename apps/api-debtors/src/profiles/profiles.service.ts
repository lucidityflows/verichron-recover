import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { SortOrder, DebtorProfileStatus, EmailCategory } from '@verichron/enums';
import { RequestContext } from '../core/services/request-context.service';
import { DebtorIdentityService } from '../identity/identity.service';
import { DebtorAddressService } from '../contact/services/address.service';
import { DebtorEmailService } from '../contact/services/email.service';
import { DebtorPhoneService } from '../contact/services/phone.service';
import { DebtorProfileEntity } from './entities/debtor-profile.entity';
import { DebtorAddress } from './entities/debtor-address.entity';
import { DebtorEmail } from './entities/debtor-email.entity';
import { DebtorPhone } from './entities/debtor-phone.entity';
import { CreateDebtorDto } from './dto/create-debtor.dto';
import { UpdateDebtorDto } from './dto/update-debtor.dto';
import { PartialUpdateDebtorDto } from './dto/partial-update-debtor.dto';
import { QueryDebtorsDto } from './dto/query-debtors.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { CreateEmailDto } from './dto/create-email.dto';
import { UpdateEmailDto } from './dto/update-email.dto';
import { CreatePhoneDto } from './dto/create-phone.dto';
import { UpdatePhoneDto } from './dto/update-phone.dto';
import { DebtorUpdatedDto } from '../events/event-dto/debtors/debtor-updated.dto';
import { DebtorProfileCreatedDto } from '../events/event-dto/debtors/debtor-profile-created.dto';
import { DebtorInvitationBatchRequestedDto } from '../events/event-dto/debtors/debtor-invitation-batch-requested.dto';
import {
  DebtorNotFoundException,
  DebtorAddressNotFoundException,
  DebtorEmailNotFoundException,
  DebtorPhoneNotFoundException,
  DuplicateEmailException,
  DuplicatePhoneException,
  EmailConflictException
} from './errors';

import { DebtorInvitationRequestedDto } from '../events/event-dto';
import { InvitationCoolDownException } from './errors';


/**
 * Profiles Service (Refactored & Streamlined)
 *
 * SINGLE RESPONSIBILITY: Manage debtor profiles (organization-scoped)
 *
 * This service handles:
 * - Core CRUD operations for DebtorProfile entity
 * - Organization context verification (multi-tenancy)
 * - Event publishing for profile lifecycle
 * - Delegation to specialized services for related operations
 *
 * Delegations:
 * - IdentityService: Identity matching and management
 * - AddressService: Address CRUD operations
 * - EmailService: Email CRUD operations
 * - PhoneService: Phone CRUD operations
 *
 * Multi-tenant access control is enforced via global guards (OrgContextGuard)
 * and RequestContext service provides organization context.
 */
@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);
  private readonly COOL_DOWN_DAYS = 7;

  constructor(
    @InjectRepository(DebtorProfileEntity)
    private readonly debtorRepository: Repository<DebtorProfileEntity>,
    private readonly identityService: DebtorIdentityService,
    private readonly addressService: DebtorAddressService,
    private readonly emailService: DebtorEmailService,
    private readonly phoneService: DebtorPhoneService,
    private readonly eventPublisher: EventPublisher,
    @Optional() private readonly requestContext?: RequestContext,
  ) {}

  // ========== Core Debtor CRUD ==========

  /**
   * Find all debtors with filtering and pagination
   * Scoped to the requesting organization via RequestContext
   */
  async findAll(
    query: QueryDebtorsDto,
  ): Promise<{ data: DebtorProfileEntity[]; total: number; page: number; pageSize: number }> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const {
      search,
      firstName,
      lastName,
      verificationStatus,
      hasUserAccount,
      createdAfter,
      createdBefore,
      sortBy = 'lastName',
      sortDirection = SortOrder.DESC,
      page = 1,
      pageSize = 20,
    } = query;

    // Build query to find debtors owned by this organization
    const queryBuilder = this.debtorRepository
      .createQueryBuilder('debtor')
      .where('debtor.organizationId = :organizationId', { organizationId })
      .andWhere('debtor.deletedAt IS NULL'); // Exclude soft-deleted records

    // Apply filters
    if (search) {
      queryBuilder.andWhere(
        '(debtor.firstName ILIKE :search OR debtor.lastName ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (firstName) {
      queryBuilder.andWhere('debtor.firstName ILIKE :firstName', {
        firstName: `%${firstName}%`,
      });
    }

    if (lastName) {
      queryBuilder.andWhere('debtor.lastName ILIKE :lastName', {
        lastName: `%${lastName}%`,
      });
    }

    if (verificationStatus) {
      queryBuilder.andWhere('debtor.verificationStatus = :verificationStatus', {
        verificationStatus,
      });
    }

    if (typeof hasUserAccount === 'boolean') {
      if (hasUserAccount) {
        queryBuilder.andWhere('debtor.userId IS NOT NULL');
      } else {
        queryBuilder.andWhere('debtor.userId IS NULL');
      }
    }

    if (createdAfter) {
      queryBuilder.andWhere('debtor.createdAt >= :createdAfter', {
        createdAfter: new Date(createdAfter),
      });
    }

    if (createdBefore) {
      queryBuilder.andWhere('debtor.createdAt <= :createdBefore', {
        createdBefore: new Date(createdBefore),
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`debtor.${sortBy}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${data.length} of ${total} debtors for organization ${organizationId}`,
    );

    return { data, total, page, pageSize };
  }

  /**
   * Find one debtor by ID
   * Scoped to requesting organization
   */
  async findOne(debtorId: string): Promise<DebtorProfileEntity> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const debtor = await this.debtorRepository.findOne({
      where: { id: debtorId, organizationId, deletedAt: IsNull() },
      relations: ['addresses', 'emails', 'phones'],
    });

    if (!debtor) {
      throw new DebtorNotFoundException(debtorId);
    }

    return debtor;
  }

  /**
   * Create a new debtor profile
   * Automatically associates with requesting organization via RequestContext
   */
  async create(createDebtorDto: CreateDebtorDto): Promise<DebtorProfileEntity> {
    const organizationId = this.requestContext?.getOrgId();
    const userId = this.requestContext?.getUserId();

    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    // Find or create debtor identity
    const { identity } = await this.identityService.findOrCreateIdentity({
      userId: createDebtorDto.userId,
    });

    // Create debtor profile entity with organizationId and identity
    const debtor = this.debtorRepository.create({
      ...createDebtorDto,
      organizationId,
      debtorIdentityId: identity.id,
      dateOfBirth: createDebtorDto.dateOfBirth
        ? new Date(createDebtorDto.dateOfBirth)
        : undefined,
    });

    const savedDebtor = await this.debtorRepository.save(debtor);

    this.logger.log(
      `Created debtor profile ${savedDebtor.id} for organization ${organizationId}`,
    );

    // Publish DebtorProfileCreated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_PROFILE_CREATED,
      {
        profileId: savedDebtor.id,
        identityId: savedDebtor.debtorIdentityId,
        organizationId,
        createdAt: savedDebtor.createdAt.toISOString(),
      },
      DebtorProfileCreatedDto,
    );

    this.logger.log(`Published DebtorProfileCreated event for ${savedDebtor.id}`);

    return savedDebtor;
  }

  /**
   * Full update of debtor profile
   */
  async update(
    debtorId: string,
    updateDebtorDto: UpdateDebtorDto,
  ): Promise<DebtorProfileEntity> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const debtor = await this.debtorRepository.findOne({
      where: { id: debtorId, organizationId, deletedAt: IsNull() },
    });

    if (!debtor) {
      throw new DebtorNotFoundException(debtorId);
    }

    // Track which fields are being updated
    const updatedFields: string[] = [];
    if (updateDebtorDto.firstName !== undefined) updatedFields.push('firstName');
    if (updateDebtorDto.lastName !== undefined) updatedFields.push('lastName');
    if (updateDebtorDto.middleName !== undefined) updatedFields.push('middleName');
    if (updateDebtorDto.dateOfBirth !== undefined) updatedFields.push('dateOfBirth');
    if (updateDebtorDto.userId !== undefined) updatedFields.push('userId');
    if (updateDebtorDto.verificationStatus !== undefined) updatedFields.push('verificationStatus');
    if (updateDebtorDto.notes !== undefined) updatedFields.push('notes');

    Object.assign(debtor, {
      ...updateDebtorDto,
      dateOfBirth: updateDebtorDto.dateOfBirth
        ? new Date(updateDebtorDto.dateOfBirth)
        : debtor.dateOfBirth,
    });

    const updated = await this.debtorRepository.save(debtor);

    this.logger.log(
      `Updated debtor ${debtorId} for organization ${organizationId}`,
    );

    // Publish DebtorUpdated event
    if (updatedFields.length > 0) {
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
        {
          debtorId: updated.id,
          organizationId,
          updatedAt: updated.updatedAt.toISOString(),
          updatedFields,
        },
        DebtorUpdatedDto,
      );

      this.logger.log(`Published DebtorUpdated event for ${debtorId}`);
    }

    return updated;
  }

  /**
   * Partial update of debtor profile
   */
  async partialUpdate(
    debtorId: string,
    partialUpdateDto: PartialUpdateDebtorDto,
  ): Promise<DebtorProfileEntity> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const debtor = await this.debtorRepository.findOne({
      where: { id: debtorId, organizationId, deletedAt: IsNull() },
    });

    if (!debtor) {
      throw new DebtorNotFoundException(debtorId);
    }

    // Track which fields are being updated
    const updatedFields: string[] = [];

    // Only update provided fields
    if (partialUpdateDto.firstName !== undefined) {
      debtor.firstName = partialUpdateDto.firstName;
      updatedFields.push('firstName');
    }
    if (partialUpdateDto.lastName !== undefined) {
      debtor.lastName = partialUpdateDto.lastName;
      updatedFields.push('lastName');
    }
    if (partialUpdateDto.middleName !== undefined) {
      debtor.middleName = partialUpdateDto.middleName;
      updatedFields.push('middleName');
    }
    if (partialUpdateDto.dateOfBirth !== undefined) {
      debtor.dateOfBirth = partialUpdateDto.dateOfBirth
        ? new Date(partialUpdateDto.dateOfBirth)
        : undefined;
      updatedFields.push('dateOfBirth');
    }
    // Note: userId is managed via IdentityService, not via profile updates
    if (partialUpdateDto.verificationStatus !== undefined) {
      debtor.verificationStatus = partialUpdateDto.verificationStatus;
      updatedFields.push('verificationStatus');
    }
    if (partialUpdateDto.notes !== undefined) {
      debtor.notes = partialUpdateDto.notes;
      updatedFields.push('notes');
    }

    const updated = await this.debtorRepository.save(debtor);

    this.logger.log(
      `Partially updated debtor ${debtorId} for organization ${organizationId}`,
    );

    // Publish DebtorUpdated event
    if (updatedFields.length > 0) {
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
        {
          debtorId: updated.id,
          organizationId,
          updatedAt: updated.updatedAt.toISOString(),
          updatedFields,
        },
        DebtorUpdatedDto,
      );

      this.logger.log(`Published DebtorUpdated event for ${debtorId}`);
    }

    return updated;
  }

  /**
   * Soft delete debtor by setting deletedAt timestamp
   * Maintains audit trail and data integrity for compliance
   */
    async remove(debtorId: string): Promise<void> {
      const organizationId = this.requestContext?.getOrgId();
      if (!organizationId) {
        throw new Error('Organization context is required');
      }
  
      // Verify debtor exists and belongs to organization before soft deleting
      const debtor = await this.debtorRepository.findOne({
        where: { id: debtorId, organizationId, deletedAt: IsNull() },
      });
  
      if (!debtor) {
        throw new DebtorNotFoundException(debtorId);
      }
  
      // Perform soft delete by setting deletedAt timestamp
      const deletedAt = new Date();
      await this.debtorRepository.update(debtorId, {
        deletedAt,
      });
  
      this.logger.log(
        `Soft deleted debtor ${debtorId} for organization ${organizationId}`,
      );
  
      // Publish DebtorUpdated event with deletedAt field
      // (There is no separate DEBTOR_DELETED event - soft deletes are treated as updates)
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_PROFILE_UPDATED,
        {
          debtorId,
          organizationId,
          updatedAt: deletedAt.toISOString(),
          updatedFields: ['deletedAt'],
        },
        DebtorUpdatedDto,
      );
  
      this.logger.log(`Published DebtorUpdated event for soft delete of ${debtorId}`);
    }
  
    // ========== Debtor Invitation ==========
    async inviteDebtor(
      debtorId: string,
      inviteData: { email: string; firstName: string; lastName: string },
    ): Promise<{ message: string; debtorId: string; userId?: string; invitationSent: boolean }> {
    
      const organizationId = this.requestContext?.getOrgId();
      const invitedBy = this.requestContext?.getUserId();
      if (!organizationId || !invitedBy) {
        throw new Error('Organization and user context are required for invitation.');
    } 

    // 1. Verify debtor exists and belongs to organization
    const debtorProfile = await this.verifyDebtorOwnership(debtorId);
    const debtorIdentityId = debtorProfile.debtorIdentityId;

    // 2. Check cool-down policy (skip in test environment)
    if (debtorProfile.invitedAt && process.env.NODE_ENV !== 'test') {
      const retryDate = new Date(debtorProfile.invitedAt);
      retryDate.setDate(retryDate.getDate() + this.COOL_DOWN_DAYS);
      
      if (new Date() < retryDate) {
        throw new InvitationCoolDownException(debtorId, retryDate);
      }
    }

    // 3. Check for global email conflict
    // First, check if identity exists by email in the IdentityService (verified identities)
    const identityByVerifiedEmail = await this.identityService.findIdentityByMatchingCriteria({
      email: inviteData.email,
    });
    
    if (identityByVerifiedEmail && identityByVerifiedEmail.id !== debtorIdentityId) {
      throw new EmailConflictException(inviteData.email);
    }

    // Second, check all debtor email records directly (even unverified ones)
    const identityIdByEmail = await this.emailService.findIdentityByEmail(inviteData.email);

    if (identityIdByEmail && identityIdByEmail !== debtorIdentityId) {
      throw new EmailConflictException(inviteData.email);
    }
     
    // 4. If no conflict, add the email to the current debtor profile
    try {
      await this.emailService.create(debtorId, {
        email: inviteData.email,
        isPrimary: true,
        emailCategory: EmailCategory.GENERAL,
      });
    } catch (error) {
      if (error instanceof DuplicateEmailException) {
        this.logger.warn(`Email ${inviteData.email} already exists for debtor ${debtorId}. Ignoring duplicate error during invite.`);
      } else {
        throw error;
      }
    }

    // 5. Update invitedAt timestamp and status
    const now = new Date();
    await this.debtorRepository.update(debtorId, {
      invitedAt: now,
      status: DebtorProfileStatus.INVITED,
    });

    // 6. Publish event to api-users to create/link user account
    const eventPayload: DebtorInvitationRequestedDto = {
      debtorProfileId: debtorId,
      debtorIdentityId,
      organizationId,
      email: inviteData.email,
      firstName: inviteData.firstName,
      lastName: inviteData.lastName,
      invitedBy,
    };

  await this.eventPublisher.publish(
    EVENT_TYPES.DEBTORS_INVITATION_REQUESTED,
    eventPayload,
    DebtorInvitationRequestedDto,
  );
     
  this.logger.log(`Published DebtorInvited event for debtor ${debtorId}`);

  return {
    message: 'Debtor invitation process initiated',
    debtorId,
    invitationSent: true,
  };
}
  
    // ========== Address Management ==========
    // Delegates to AddressService while maintaining organization context verification
  

  /**
   * Get all addresses for a debtor
   */
  async findAllAddresses(debtorId: string): Promise<DebtorAddress[]> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    // Delegate to AddressService with org verification (single optimized query)
    return this.addressService.findByProfile(debtorId, organizationId);
  }

  /**
   * Get a specific address
   */
  async findOneAddress(
    debtorId: string,
    addressId: string,
  ): Promise<DebtorAddress> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Delegate to AddressService
    const address = await this.addressService.findById(addressId);

    if (address?.debtorProfileId !== debtorId) {
      throw new DebtorAddressNotFoundException(addressId, debtorId);
    }

    return address;
  }

  /**
   * Add a new address to a debtor
   */
  async createAddress(
    debtorId: string,
    createAddressDto: CreateAddressDto,
  ): Promise<DebtorAddress> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Delegate to AddressService
    return this.addressService.create(debtorId, createAddressDto);
  }

  /**
   * Update an existing address
   */
  async updateAddress(
    debtorId: string,
    addressId: string,
    updateAddressDto: UpdateAddressDto,
  ): Promise<DebtorAddress> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify address belongs to debtor
    const address = await this.addressService.findById(addressId);
    if (address?.debtorProfileId !== debtorId) {
      throw new DebtorAddressNotFoundException(addressId, debtorId);
    }

    // Delegate to AddressService
    return this.addressService.update(addressId, updateAddressDto);
  }

  /**
   * Remove an address
   */
  async removeAddress(
    debtorId: string,
    addressId: string,
  ): Promise<void> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify address belongs to debtor
    const address = await this.addressService.findById(addressId);
    if (address?.debtorProfileId !== debtorId) {
      throw new DebtorAddressNotFoundException(addressId, debtorId);
    }

    // Delegate to AddressService
    await this.addressService.delete(addressId);
  }
  // ========== Email Management ==========
  // Delegates to EmailService while maintaining organization context verification

  /**
   * Get all emails for a debtor
   */
  async findAllEmails(debtorId: string): Promise<DebtorEmail[]> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    // Delegate to EmailService with org verification (single optimized query)
    return this.emailService.findByProfile(debtorId, organizationId);
  }

  /**
   * Get a specific email
   */
  async findOneEmail(
    debtorId: string,
    emailId: string,
  ): Promise<DebtorEmail> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Delegate to EmailService
    const email = await this.emailService.findById(emailId);

    if (email?.debtorProfileId !== debtorId) {
      throw new DebtorEmailNotFoundException(emailId, debtorId);
    }

    return email;
  }

  /**
   * Add a new email to a debtor
   */
  async createEmail(
    debtorId: string,
    createEmailDto: CreateEmailDto,
  ): Promise<DebtorEmail> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    try {
      // Delegate to EmailService
      return await this.emailService.create(debtorId, createEmailDto);
    } catch (error: any) {
      // Re-throw as domain-specific exception
      if (error.message?.includes('already exists')) {
        throw new DuplicateEmailException(createEmailDto.email, debtorId);
      }
      throw error;
    }
  }

  /**
   * Update an existing email
   */
  async updateEmail(
    debtorId: string,
    emailId: string,
    updateEmailDto: UpdateEmailDto,
  ): Promise<DebtorEmail> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify email belongs to debtor
    const email = await this.emailService.findById(emailId);
    if (email?.debtorProfileId !== debtorId) {
      throw new DebtorEmailNotFoundException(emailId, debtorId);
    }

    try {
      // Delegate to EmailService
      return await this.emailService.update(emailId, updateEmailDto);
    } catch (error: any) {
      // Re-throw as domain-specific exception
      if (error.message?.includes('already exists')) {
        throw new DuplicateEmailException(updateEmailDto.email!, debtorId);
      }
      throw error;
    }
  }

  /**
   * Remove an email
   */
  async removeEmail(
    debtorId: string,
    emailId: string,
  ): Promise<void> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify email belongs to debtor
    const email = await this.emailService.findById(emailId);
    if (email?.debtorProfileId !== debtorId) {
      throw new DebtorEmailNotFoundException(emailId, debtorId);
    }

    // Delegate to EmailService
    await this.emailService.delete(emailId);
  }
  // ========== Phone Management ==========
  // Delegates to PhoneService while maintaining organization context verification

  /**
   * Get all phones for a debtor
   */
  async findAllPhones(debtorId: string): Promise<DebtorPhone[]> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    // Delegate to PhoneService with org verification (single optimized query)
    return this.phoneService.findByProfile(debtorId, organizationId);
  }

  /**
   * Get a specific phone
   */
  async findOnePhone(
    debtorId: string,
    phoneId: string,
  ): Promise<DebtorPhone> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Delegate to PhoneService
    const phone = await this.phoneService.findById(phoneId);

    if (phone?.debtorProfileId !== debtorId) {
      throw new DebtorPhoneNotFoundException(phoneId, debtorId);
    }

    return phone;
  }

  /**
   * Add a new phone to a debtor
   */
  async createPhone(
    debtorId: string,
    createPhoneDto: CreatePhoneDto,
  ): Promise<DebtorPhone> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    try {
      // Delegate to PhoneService
      return await this.phoneService.create(debtorId, createPhoneDto);
    } catch (error: any) {
      // Re-throw as domain-specific exception
      if (error.message?.includes('already exists')) {
        throw new DuplicatePhoneException(createPhoneDto.phoneNumber, debtorId);
      }
      throw error;
    }
  }

  /**
   * Update an existing phone
   */
  async updatePhone(
    debtorId: string,
    phoneId: string,
    updatePhoneDto: UpdatePhoneDto,
  ): Promise<DebtorPhone> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify phone belongs to debtor
    const phone = await this.phoneService.findById(phoneId);
    if (phone?.debtorProfileId !== debtorId) {
      throw new DebtorPhoneNotFoundException(phoneId, debtorId);
    }

    try {
      // Delegate to PhoneService
      return await this.phoneService.update(phoneId, updatePhoneDto);
    } catch (error: any) {
      // Re-throw as domain-specific exception
      if (error.message?.includes('already exists')) {
        throw new DuplicatePhoneException(updatePhoneDto.phoneNumber!, debtorId);
      }
      throw error;
    }
  }

  /**
   * Remove a phone
   */
  async removePhone(
    debtorId: string,
    phoneId: string,
  ): Promise<void> {
    // Verify debtor exists and belongs to organization
    await this.verifyDebtorOwnership(debtorId);

    // Verify phone belongs to debtor
    const phone = await this.phoneService.findById(phoneId);
    if (phone?.debtorProfileId !== debtorId) {
      throw new DebtorPhoneNotFoundException(phoneId, debtorId);
    }

    // Delegate to PhoneService
    await this.phoneService.delete(phoneId);
  }
  // ========== Helper Methods ==========

  /**
   * Verify that a debtor exists and belongs to the requesting organization.
   *
   * @param debtorId - The debtor profile ID to verify
   * @throws DebtorNotFoundException if debtor doesn't exist or doesn't belong to org
   */
  private async verifyDebtorOwnership(debtorId: string): Promise<DebtorProfileEntity> {
    const organizationId = this.requestContext?.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.debug(`Verifying debtor ownership for debtorId: ${debtorId}, organizationId: ${organizationId}`);
    const debtor = await this.debtorRepository.findOne({
      where: { id: debtorId, organizationId, deletedAt: IsNull() },
    });
    this.logger.debug(`Result of findOne for debtorId ${debtorId}: ${debtor ? 'Found' : 'Not Found'}`);

    if (!debtor) {
      throw new DebtorNotFoundException(debtorId);
    }

    return debtor;
  }

  /**
   * @deprecated This method is obsolete with the new modular architecture.
   * Use ImportsModule instead, which handles:
   * - Identity matching via IdentityService
   * - Profile creation via ProfilesService.create()
   * - Contact creation via ContactModule services
   *
   * This method will be removed in a future version.
   *
   * OLD IMPLEMENTATION NOTE:
   * The de-duplication logic in this method was insufficient and could lead to:
   * 1. False positives (incorrectly merging different people)
   * 2. False negatives (creating duplicates for same person)
   *
   * The new IdentityService uses email/SSN exact matching for MVP,
   * with plans for fuzzy matching and confidence scoring in the future.
   *
   * See: DebtorImportProcessor in ImportsModule for new implementation
   */
  async findOrCreateFromImport(
    debtorData: any,
    importJobId?: string,
  ): Promise<DebtorProfileEntity> {
    // TODO: Remove this method once all consumers migrate to ImportsModule
    throw new Error(
      'findOrCreateFromImport is deprecated. Use ImportsModule.DebtorImportProcessor instead.',
    );
  }

  /**
   * Find or create a debtor profile for a given identity and organization.
   *
   * This is used by ImportsModule after identity matching is complete.
   *
   * @param debtorIdentityId - The global debtor identity ID
   * @param organizationId - The organization to create profile for
   * @param profileData - Basic profile information
   * @returns Existing or newly created debtor profile
   */
  async findOrCreateProfile(
    debtorIdentityId: string,
    organizationId: string,
    profileData: {
      firstName: string;
      lastName: string;
      middleName?: string;
      dateOfBirth?: string;
      notes?: string;
    },
  ): Promise<{ profile: DebtorProfileEntity; isNew: boolean }> {
    // Try to find existing profile for this identity + organization
    const existingProfile = await this.debtorRepository.findOne({
      where: {
        debtorIdentityId,
        organizationId,
        deletedAt: IsNull(),
      },
    });

    if (existingProfile) {
      this.logger.log(
        `Found existing profile ${existingProfile.id} for identity ${debtorIdentityId} in org ${organizationId}`,
      );
      return { profile: existingProfile, isNew: false };
    }

    // Create new profile
    const newProfile = this.debtorRepository.create({
      debtorIdentityId,
      organizationId,
      firstName: profileData.firstName,
      lastName: profileData.lastName,
      middleName: profileData.middleName,
      dateOfBirth: profileData.dateOfBirth
        ? new Date(profileData.dateOfBirth)
        : undefined,
      notes: profileData.notes,
    });

    const savedProfile = await this.debtorRepository.save(newProfile);

    this.logger.log(
      `Created new profile ${savedProfile.id} for identity ${debtorIdentityId} in org ${organizationId}`,
    );

    // Publish DebtorProfileCreated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_PROFILE_CREATED,
      {
        profileId: savedProfile.id,
        identityId: savedProfile.debtorIdentityId,
        organizationId: savedProfile.organizationId,
        createdAt: savedProfile.createdAt.toISOString(),
      },
      DebtorProfileCreatedDto,
    );
    this.logger.log(`Published DebtorProfileCreated event for ${savedProfile.id}`);

    return { profile: savedProfile, isNew: true };
  }

  /**
   * Invite debtors from a portfolio to become debtor users.
   *
   * This method:
   * 1. Queries all debtor profiles associated with debts in the portfolio
   * 2. Filters profiles that are eligible for invitation (PENDING_INVITATION status, have email)
   * 3. Splits invitations into batches (100 per batch)
   * 4. Publishes DEBTORS_INVITATION_BATCH_SENT events
   * 5. Updates profile status to INVITED and sets invitedAt timestamp
   *
   * @param portfolioId - Portfolio to invite debtors from
   * @returns Summary of invitation job
   */
  async invitePortfolioDebtors(
    portfolioId: string,
  ): Promise<{
    invitationBatchId: string;
    totalInvitations: number;
    totalBatches: number;
    skipped: number;
  }> {
    const organizationId = this.requestContext?.getOrgId();
    const userId = this.requestContext?.getUserId();
    if (!organizationId || !userId) {
      throw new Error('Organization and user context are required');
    }

    this.logger.log(
      `Starting portfolio invitation for portfolio ${portfolioId} in org ${organizationId}`,
      { portfolioId, organizationId, invitedBy: userId },
    );

    // Query all debtor profiles for this portfolio with their primary emails
    // Note: Requires join through debts → debt_debtor → debtor_profiles
    const profilesWithEmails = await this.debtorRepository
      .createQueryBuilder('profile')
      .innerJoin('debt_debtor', 'dd', 'dd.debtor_profile_id = profile.id')
      .innerJoin('debts', 'd', 'd.id = dd.debt_id')
      .leftJoinAndSelect('profile.emails', 'email', 'email.is_primary = :isPrimary AND email.deleted_at IS NULL', { isPrimary: true })
      .where('d.portfolio_id = :portfolioId', { portfolioId })
      .andWhere('profile.organization_id = :organizationId', { organizationId })
      .andWhere('profile.deleted_at IS NULL')
      .distinct(true)
      .getMany();

    const profiles = profilesWithEmails.map((profile) => ({
      ...profile,
      email: profile.emails?.[0]?.email || null,
    }));

    this.logger.log(`Found ${profiles.length} debtor profiles for portfolio ${portfolioId}`);

    // Filter eligible profiles:
    // 1. Must have an email
    // 2. Status is PENDING_INVITATION OR (Status is INVITED AND cool-down passed)
    const eligibleProfiles = profiles.filter((profile) => {
      if (!profile.email) return false;
      
      if (profile.status === DebtorProfileStatus.PENDING_INVITATION) return true;
      
      if (profile.status === DebtorProfileStatus.INVITED && profile.invitedAt) {
        const retryDate = new Date(profile.invitedAt);
        retryDate.setDate(retryDate.getDate() + this.COOL_DOWN_DAYS);
        return new Date() >= retryDate;
      }
      
      return false;
    });

    const skipped = profiles.length - eligibleProfiles.length;

    if (eligibleProfiles.length === 0) {
      this.logger.warn(
        `No eligible profiles to invite for portfolio ${portfolioId}`,
        { totalProfiles: profiles.length, skipped },
      );
      return {
        invitationBatchId: '',
        totalInvitations: 0,
        totalBatches: 0,
        skipped,
      };
    }

    this.logger.log(
      `${eligibleProfiles.length} eligible profiles to invite (${skipped} skipped)`,
    );

    // Generate invitation batch ID
    const invitationBatchId = `inv-${portfolioId}-${Date.now()}`;
    const BATCH_SIZE = 100;
    const totalBatches = Math.ceil(eligibleProfiles.length / BATCH_SIZE);

    // Process batches
    for (let i = 0; i < totalBatches; i++) {
      const startIndex = i * BATCH_SIZE;
      const endIndex = Math.min(startIndex + BATCH_SIZE, eligibleProfiles.length);
      const batchProfiles = eligibleProfiles.slice(startIndex, endIndex);

      // Build invitation data (email already fetched in query)
      const invitations = batchProfiles.map((profile) => ({
        debtorProfileId: profile.id,
        debtorIdentityId: profile.debtorIdentityId,
        organizationId,
        email: profile.email!,
        firstName: profile.firstName,
        lastName: profile.lastName,
        invitedBy: userId,
      }));

      if (invitations.length === 0) continue;

      // Publish invitation batch event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_INVITATION_BATCH_REQUESTED,
        {
          invitationBatchId,
          organizationId,
          portfolioId,
          invitedBy: userId,
          batchNumber: i + 1,
          totalBatches,
          invitations,
          invitedAt: new Date().toISOString(),
        },
        DebtorInvitationBatchRequestedDto,
      );

      this.logger.log(
        `Published invitation batch ${i + 1}/${totalBatches} with ${invitations.length} invitations`,
      );

      // Update profile statuses to INVITED and update invitedAt
      await this.debtorRepository.update(
        { id: In(invitations.map((inv) => inv.debtorProfileId)) },
        {
          status: DebtorProfileStatus.INVITED,
          invitedAt: new Date(),
        },
      );
    }

    this.logger.log(
      `Completed portfolio invitation for ${portfolioId}: ${eligibleProfiles.length} invitations sent in ${totalBatches} batches`,
    );

    return {
      invitationBatchId,
      totalInvitations: eligibleProfiles.length,
      totalBatches: totalBatches,
      skipped,
    };
  }

  /**
   * Set the sticky primary collector for a debtor profile.
   * Only updates if primary_collector_id is currently null to preserve first-contact ownership.
   */
  async setStickyCollector(
    organizationId: string,
    debtorProfileId: string,
    collectorId: string,
  ): Promise<void> {
    const debtor = await this.debtorRepository.findOne({
      where: {
        id: debtorProfileId,
        organizationId,
        deletedAt: IsNull(),
      },
    });

    if (!debtor) {
      this.logger.warn(`Debtor profile ${debtorProfileId} not found in org ${organizationId}, cannot set sticky collector`);
      return;
    }

    // Only set if not already assigned
    if (!debtor.primaryCollectorId) {
      await this.debtorRepository.update(debtorProfileId, {
        primaryCollectorId: collectorId,
      });
      this.logger.log(`Set sticky collector ${collectorId} for debtor ${debtorProfileId}`);
    } else {
      this.logger.debug(`Debtor ${debtorProfileId} already has sticky collector ${debtor.primaryCollectorId}, skipping update`);
    }
  }
}

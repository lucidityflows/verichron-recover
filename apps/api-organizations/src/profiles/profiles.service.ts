import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Organization,
  OrganizationAddress,
  OrganizationEmail,
  OrganizationPhoneNumber,
} from './entities';
import {
  OrganizationNotFoundException,
  OrganizationAlreadyExistsException,
  AddressNotFoundException,
  EmailNotFoundException,
  PhoneNumberNotFoundException,
  AuditContextMissingException,
} from '../core/exceptions';
import {
  validatePaginationOptions,
  executePaginatedQuery,
  applySorting,
  applyPartialMatch,
  applyEnumFilter,
  applySearchFilter,
  applyExactMatch,
} from '../core/utils';
import { PaginatedResponseDto } from '../core/dto';
import {
  CreateOrganizationDto,
  UpdateOrganizationDto,
  OrganizationResponseDto,
  OrganizationQueryDto,
  CreateAddressDto,
  UpdateAddressDto,
  AddressResponseDto,
  CreateEmailDto,
  UpdateEmailDto,
  EmailResponseDto,
  CreatePhoneNumberDto,
  UpdatePhoneNumberDto,
  PhoneNumberResponseDto,
} from './dto';
import { EventPublisher } from '@verichron/event-publisher';
import {
  EVENT_TYPES,
} from '@verichron/events';
import { OrganizationStatus } from '@verichron/enums';
import { RequestContext } from '../core/services/request-context.service';
import {
  OrganizationUpdatedDto,
  OrganizationNameChangedDto,
  OrganizationStatusUpdatedDto,
} from '../events/event-dto/organizations';

/**
 * Profiles service handles all organization profile and contact information business logic
 */
@Injectable()
export class ProfilesService {
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    @InjectRepository(Organization)
    private readonly organizationRepository: Repository<Organization>,
    @InjectRepository(OrganizationAddress)
    private readonly addressRepository: Repository<OrganizationAddress>,
    @InjectRepository(OrganizationEmail)
    private readonly emailRepository: Repository<OrganizationEmail>,
    @InjectRepository(OrganizationPhoneNumber)
    private readonly phoneNumberRepository: Repository<OrganizationPhoneNumber>,
    private readonly eventPublisher: EventPublisher,
    private readonly requestContext: RequestContext,
  ) {}

  // ============================================================================
  // Organization Methods
  // ============================================================================

  async createOrganization(
    dto: CreateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    try {
      // Check if organization with same name already exists
      const existing = await this.organizationRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new OrganizationAlreadyExistsException(dto.name);
      }

      const organization = this.organizationRepository.create({
        name: dto.name,
        displayName: dto.displayName,
        organizationType: dto.organizationType,
        parentOrganizationId: dto.parentOrganizationId,
        taxId: dto.taxId,
        settings: dto.settings,
        status: OrganizationStatus.PROVISIONING,
      });

      const saved = await this.organizationRepository.save(organization);
      this.logger.log(`Created organization with ID: ${saved.id}`);

      // NOTE: This endpoint creates an organization shell only.
      // For full tenant onboarding with admin user provisioning, use POST /onboarding
      // See ONBOARDING_PROTOCOLS.md for details.
      // No OrganizationCreated event is published here to avoid triggering user provisioning.

      return this.mapOrganizationToResponse(saved);
    } catch (error) {
      this.logger.error(
        `Failed to create organization: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findAllOrganizations(
    query: OrganizationQueryDto,
    orgId: string,
  ): Promise<PaginatedResponseDto<OrganizationResponseDto>> {
    try {
      const paginationOptions = validatePaginationOptions(
        query.page,
        query.pageSize,
      );

      const qb = this.organizationRepository.createQueryBuilder('org');

      // Apply search filter (searches name and displayName)
      if (query.search) {
        applySearchFilter(
          qb,
          'org',
          ['name', 'displayName'],
          query.search,
          'search',
        );
      }

      // Apply specific filters
      applyPartialMatch(qb, 'org', 'name', query.name, 'name');
      applyEnumFilter(
        qb,
        'org',
        'organizationType',
        query.organizationType,
        'organizationType',
      );
      applyEnumFilter(qb, 'org', 'status', query.status, 'status');
      applyExactMatch(
        qb,
        'org',
        'parentOrganizationId',
        query.parentOrganizationId,
        'parentOrganizationId',
      );

      // Filter for top-level organizations only
      if (query.topLevelOnly) {
        qb.andWhere('org.parentOrganizationId IS NULL');
      }

      // SECURITY: Enforce organization-level data isolation
      // Tenant-scoped users can only see their own organization
      qb.andWhere('org.id = :orgId', { orgId });
      this.logger.debug(`[Data Isolation] Strictly filtering for orgId: ${orgId}`);

      // Apply sorting
      const allowedSortFields = [
        'name',
        'displayName',
        'organizationType',
        'status',
        'createdAt',
        'updatedAt',
      ];
      applySorting(
        qb,
        'org',
        query.sortBy,
        query.sortOrder,
        allowedSortFields,
      );

      const result = await executePaginatedQuery(qb, paginationOptions);
      return {
        ...result,
        data: result.data.map((org) => this.mapOrganizationToResponse(org)),
      };
    } catch (error) {
      this.logger.error(
        `Failed to find organizations: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findOneOrganization(orgId: string): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
      });

      if (!organization) {
        throw new OrganizationNotFoundException(orgId);
      }

      return this.mapOrganizationToResponse(organization);
    } catch (error) {
      this.logger.error(
        `Failed to find organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateOrganization(
    orgId: string,
    dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
      });

      if (!organization) {
        throw new OrganizationNotFoundException(orgId);
      }

      // Track changes for event publishing
      const updatedFields: string[] = [];
      const oldName = organization.name;
      const oldStatus = organization.status;

      // Update fields
      if (dto.name !== undefined && dto.name !== organization.name) {
        organization.name = dto.name;
        updatedFields.push('name');
      }
      if (dto.displayName !== undefined && dto.displayName !== organization.displayName) {
        organization.displayName = dto.displayName;
        updatedFields.push('displayName');
      }
      if (dto.organizationType !== undefined && dto.organizationType !== organization.organizationType) {
        organization.organizationType = dto.organizationType;
        updatedFields.push('organizationType');
      }
      if (dto.parentOrganizationId !== undefined && dto.parentOrganizationId !== organization.parentOrganizationId) {
        organization.parentOrganizationId = dto.parentOrganizationId;
        updatedFields.push('parentOrganizationId');
      }
      if (dto.taxId !== undefined && dto.taxId !== organization.taxId) {
        organization.taxId = dto.taxId;
        updatedFields.push('taxId');
      }
      if (dto.status !== undefined && dto.status !== organization.status) {
        organization.status = dto.status;
        updatedFields.push('status');
      }
      if (dto.settings !== undefined && JSON.stringify(dto.settings) !== JSON.stringify(organization.settings)) {
        organization.settings = dto.settings;
        updatedFields.push('settings');
      }

      const updated = await this.organizationRepository.save(organization);
      this.logger.log(`Updated organization ${orgId}`);

      // Publish events for changes
      if (updatedFields.length > 0) {
        // Publish general OrganizationUpdated event
        await this.eventPublisher.publish(
          EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_UPDATED,
          {
            organizationId: orgId,
            updatedFields,
            updatedAt: updated.updatedAt.toISOString(),
            updatedBy: this.requestContext.getUserId() || '00000000-0000-0000-0000-000000000000',
          },
          OrganizationUpdatedDto,
        );
        this.logger.log(`Published OrganizationUpdated event for ${orgId}`);

        // Publish specific event for name change
        if (updatedFields.includes('name')) {
          await this.eventPublisher.publish(
            EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_NAME_CHANGED,
            {
              organizationId: orgId,
              previousName: oldName,
              newName: updated.name,
              changedAt: new Date().toISOString(),
              updatedBy: this.requestContext.getUserId() || '00000000-0000-0000-0000-000000000000',
            },
            OrganizationNameChangedDto,
          );
          this.logger.log(`Published OrganizationNameChanged event for ${orgId}`);
        }

        // Publish specific event for status change
        if (updatedFields.includes('status')) {
          const userId = this.requestContext.getUserId();
          const username = this.requestContext.getUsername();
          const email = this.requestContext.getUserEmail();

          if (!userId || !username || !email) {
            throw new AuditContextMissingException();
          }

          const actor = {
            id: userId,
            name: username,
            email: email,
            role: 'ORG_USER',
          };

          await this.eventPublisher.publish(
            EVENT_TYPES.ORGANIZATIONS_ORGANIZATION_STATUS_CHANGED,
            {
              organizationId: orgId,
              previousStatus: oldStatus,
              newStatus: updated.status,
              reason: '', // TODO: Add reason parameter to UpdateOrganizationDto
              updatedBy: userId,
              actor,
              statusChangedAt: new Date().toISOString(),
            },
            OrganizationStatusUpdatedDto,
          );
          this.logger.log(`Published OrganizationStatusChanged event for ${orgId}`);
        }
      }

      return this.mapOrganizationToResponse(updated);
    } catch (error) {
      this.logger.error(
        `Failed to update organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteOrganization(orgId: string): Promise<void> {
    try {
      const organization = await this.organizationRepository.findOne({
        where: { id: orgId },
      });

      if (!organization) {
                            throw new OrganizationNotFoundException(orgId);
                        }
                  
                        // Soft delete by setting status to INACTIVE
                        organization.status = OrganizationStatus.INACTIVE;
                        await this.organizationRepository.save(organization);
                        this.logger.log(`Soft deleted organization ${orgId}`);    } catch (error) {
      this.logger.error(
        `Failed to delete organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================================================
  // Address Methods
  // ============================================================================

  async findAllAddresses(orgId: string): Promise<AddressResponseDto[]> {
    try {
      await this.verifyOrganizationExists(orgId);

      const addresses = await this.addressRepository.find({
        where: { organizationId: orgId },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });

      return addresses.map((address) => this.mapAddressToResponse(address));
    } catch (error) {
      this.logger.error(
        `Failed to find addresses for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createAddress(
    orgId: string,
    dto: CreateAddressDto,
  ): Promise<AddressResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const address = this.addressRepository.create({
        organizationId: orgId,
        street1: dto.street1,
        street2: dto.street2,
        street3: dto.street3,
        city: dto.city,
        state: dto.state,
        postalCode: dto.postalCode,
        country: dto.country || 'US',
        latitude: dto.latitude,
        longitude: dto.longitude,
        isPrimary: dto.isPrimary || false,
        addressCategory: dto.addressCategory,
      });

      const saved = await this.addressRepository.save(address);
      this.logger.log(`Created address ${saved.id} for organization ${orgId}`);
      return this.mapAddressToResponse(saved);
    } catch (error) {
      this.logger.error(
        `Failed to create address for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateAddress(
    orgId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<AddressResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const address = await this.addressRepository.findOne({
        where: { id: addressId, organizationId: orgId },
      });

      if (!address) {
        throw new AddressNotFoundException(addressId);
      }

      // Update fields
      if (dto.street1 !== undefined) address.street1 = dto.street1;
      if (dto.street2 !== undefined) address.street2 = dto.street2;
      if (dto.street3 !== undefined) address.street3 = dto.street3;
      if (dto.city !== undefined) address.city = dto.city;
      if (dto.state !== undefined) address.state = dto.state;
      if (dto.postalCode !== undefined) address.postalCode = dto.postalCode;
      if (dto.country !== undefined) address.country = dto.country;
      if (dto.latitude !== undefined) address.latitude = dto.latitude;
      if (dto.longitude !== undefined) address.longitude = dto.longitude;
      if (dto.isPrimary !== undefined) address.isPrimary = dto.isPrimary;
      if (dto.addressCategory !== undefined)
        address.addressCategory = dto.addressCategory;

      const updated = await this.addressRepository.save(address);
      this.logger.log(`Updated address ${addressId}`);
      return this.mapAddressToResponse(updated);
    } catch (error) {
      this.logger.error(
        `Failed to update address ${addressId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteAddress(orgId: string, addressId: string): Promise<void> {
    try {
      await this.verifyOrganizationExists(orgId);

      const result = await this.addressRepository.delete({
        id: addressId,
        organizationId: orgId,
      });

      if (result.affected === 0) {
        throw new AddressNotFoundException(addressId);
      }

      this.logger.log(`Deleted address ${addressId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete address ${addressId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================================================
  // Email Methods
  // ============================================================================

  async findAllEmails(orgId: string): Promise<EmailResponseDto[]> {
    try {
      await this.verifyOrganizationExists(orgId);

      const emails = await this.emailRepository.find({
        where: { organizationId: orgId },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });

      return emails.map((email) => this.mapEmailToResponse(email));
    } catch (error) {
      this.logger.error(
        `Failed to find emails for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createEmail(
    orgId: string,
    dto: CreateEmailDto,
  ): Promise<EmailResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const email = this.emailRepository.create({
        organizationId: orgId,
        email: dto.email,
        isPrimary: dto.isPrimary || false,
        isVerified: dto.isVerified ?? true,
        emailCategory: dto.emailCategory,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      });

      const saved = await this.emailRepository.save(email);
      this.logger.log(`Created email ${saved.id} for organization ${orgId}`);
      return this.mapEmailToResponse(saved);
    } catch (error) {
      this.logger.error(
        `Failed to create email for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateEmail(
    orgId: string,
    emailId: string,
    dto: UpdateEmailDto,
  ): Promise<EmailResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const email = await this.emailRepository.findOne({
        where: { id: emailId, organizationId: orgId },
      });

      if (!email) {
        throw new EmailNotFoundException(emailId);
      }

      // Update fields
      if (dto.email !== undefined) email.email = dto.email;
      if (dto.isPrimary !== undefined) email.isPrimary = dto.isPrimary;
      if (dto.isVerified !== undefined) email.isVerified = dto.isVerified;
      if (dto.emailCategory !== undefined)
        email.emailCategory = dto.emailCategory;
      if (dto.validFrom !== undefined) email.validFrom = dto.validFrom;
      if (dto.validTo !== undefined) email.validTo = dto.validTo;

      const updated = await this.emailRepository.save(email);
      this.logger.log(`Updated email ${emailId}`);
      return this.mapEmailToResponse(updated);
    } catch (error) {
      this.logger.error(
        `Failed to update email ${emailId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deleteEmail(orgId: string, emailId: string): Promise<void> {
    try {
      await this.verifyOrganizationExists(orgId);

      const result = await this.emailRepository.delete({
        id: emailId,
        organizationId: orgId,
      });

      if (result.affected === 0) {
        throw new EmailNotFoundException(emailId);
      }

      this.logger.log(`Deleted email ${emailId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete email ${emailId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================================================
  // Phone Number Methods
  // ============================================================================

  async findAllPhoneNumbers(orgId: string): Promise<PhoneNumberResponseDto[]> {
    try {
      await this.verifyOrganizationExists(orgId);

      const phoneNumbers = await this.phoneNumberRepository.find({
        where: { organizationId: orgId },
        order: { isPrimary: 'DESC', createdAt: 'ASC' },
      });

      return phoneNumbers.map((phoneNumber) =>
        this.mapPhoneNumberToResponse(phoneNumber),
      );
    } catch (error) {
      this.logger.error(
        `Failed to find phone numbers for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async createPhoneNumber(
    orgId: string,
    dto: CreatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const phoneNumber = this.phoneNumberRepository.create({
        organizationId: orgId,
        phoneNumber: dto.phoneNumber,
        extension: dto.extension,
        isPrimary: dto.isPrimary || false,
        isVerified: dto.isVerified ?? true,
        category: dto.category,
        validFrom: dto.validFrom,
        validTo: dto.validTo,
      });

      const saved = await this.phoneNumberRepository.save(phoneNumber);
      this.logger.log(
        `Created phone number ${saved.id} for organization ${orgId}`,
      );
      return this.mapPhoneNumberToResponse(saved);
    } catch (error) {
      this.logger.error(
        `Failed to create phone number for organization ${orgId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updatePhoneNumber(
    orgId: string,
    phoneNumberId: string,
    dto: UpdatePhoneNumberDto,
  ): Promise<PhoneNumberResponseDto> {
    try {
      await this.verifyOrganizationExists(orgId);

      const phoneNumber = await this.phoneNumberRepository.findOne({
        where: { id: phoneNumberId, organizationId: orgId },
      });

      if (!phoneNumber) {
        throw new PhoneNumberNotFoundException(phoneNumberId);
      }

      // Update fields
      if (dto.phoneNumber !== undefined)
        phoneNumber.phoneNumber = dto.phoneNumber;
      if (dto.extension !== undefined) phoneNumber.extension = dto.extension;
      if (dto.isPrimary !== undefined) phoneNumber.isPrimary = dto.isPrimary;
      if (dto.isVerified !== undefined)
        phoneNumber.isVerified = dto.isVerified;
      if (dto.category !== undefined)
        phoneNumber.category = dto.category;
      if (dto.validFrom !== undefined) phoneNumber.validFrom = dto.validFrom;
      if (dto.validTo !== undefined) phoneNumber.validTo = dto.validTo;

      const updated = await this.phoneNumberRepository.save(phoneNumber);
      this.logger.log(`Updated phone number ${phoneNumberId}`);
      return this.mapPhoneNumberToResponse(updated);
    } catch (error) {
      this.logger.error(
        `Failed to update phone number ${phoneNumberId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async deletePhoneNumber(orgId: string, phoneNumberId: string): Promise<void> {
    try {
      await this.verifyOrganizationExists(orgId);

      const result = await this.phoneNumberRepository.delete({
        id: phoneNumberId,
        organizationId: orgId,
      });

      if (result.affected === 0) {
        throw new PhoneNumberNotFoundException(phoneNumberId);
      }

      this.logger.log(`Deleted phone number ${phoneNumberId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete phone number ${phoneNumberId}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async verifyOrganizationExists(orgId: string): Promise<void> {
    const exists = await this.organizationRepository.existsBy({ id: orgId });
    if (!exists) {
      throw new OrganizationNotFoundException(orgId);
    }
  }

  private mapOrganizationToResponse(
    org: Organization,
  ): OrganizationResponseDto {
    return {
      id: org.id,
      name: org.name,
      displayName: org.displayName,
      organizationType: org.organizationType,
      parentOrganizationId: org.parentOrganizationId,
      taxId: org.taxId,
      status: org.status,
      settings: org.settings,
      createdAt: org.createdAt,
      updatedAt: org.updatedAt,
    };
  }

  private mapAddressToResponse(address: OrganizationAddress): AddressResponseDto {
    return {
      id: address.id,
      organizationId: address.organizationId,
      street1: address.street1,
      street2: address.street2,
      street3: address.street3,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      latitude: address.latitude,
      longitude: address.longitude,
      isPrimary: address.isPrimary,
      addressCategory: address.addressCategory,
      createdAt: address.createdAt,
      updatedAt: address.updatedAt,
    };
  }

  private mapEmailToResponse(email: OrganizationEmail): EmailResponseDto {
    return {
      id: email.id,
      organizationId: email.organizationId,
      email: email.email,
      isPrimary: email.isPrimary,
      isVerified: email.isVerified,
      emailCategory: email.emailCategory,
      validFrom: email.validFrom,
      validTo: email.validTo,
      createdAt: email.createdAt,
      updatedAt: email.updatedAt,
    };
  }

  private mapPhoneNumberToResponse(
    phoneNumber: OrganizationPhoneNumber,
  ): PhoneNumberResponseDto {
    return {
      id: phoneNumber.id,
      organizationId: phoneNumber.organizationId,
      phoneNumber: phoneNumber.phoneNumber,
      extension: phoneNumber.extension,
      isPrimary: phoneNumber.isPrimary,
      isVerified: phoneNumber.isVerified,
      category: phoneNumber.category,
      validFrom: phoneNumber.validFrom,
      validTo: phoneNumber.validTo,
      createdAt: phoneNumber.createdAt,
      updatedAt: phoneNumber.updatedAt,
    };
  }
}

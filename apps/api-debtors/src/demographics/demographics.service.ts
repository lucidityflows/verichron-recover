import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { DebtorDemographics } from './entities/debtor-demographics.entity';
import { CreateDemographicsDto } from './dto/create-demographics.dto';
import { UpdateDemographicsDto } from './dto/update-demographics.dto';
import { PartialUpdateDemographicsDto } from './dto/partial-update-demographics.dto';
import { ProfilesService } from '../profiles/profiles.service';
import {
  DemographicsNotFoundException,
  DemographicsAlreadyExistsException,
} from './errors';
import { RequestContext } from '../core/services/request-context.service';
import { EventPublisher } from '@verichron/event-publisher'; // Added import
import { EVENT_TYPES } from '@verichron/events'; // Added import
import {
  DemographicsCreatedDto,
  DemographicsUpdatedDto,
} from '../events/event-dto'; // Corrected import path

/**
 * Demographics Service
 * 
 * Manages secure storage and retrieval of sensitive debtor demographic data.
 * All operations include:
 * - Access verification through ProfilesService
 * - Audit logging for compliance (FDCPA, FCRA, etc.)
 * - Secure handling of PII
 * 
 * SECURITY NOTES:
 * - All access is logged with userId and timestamp
 * - SSN encryption should be implemented at the application layer
 * - Consider field-level encryption for production
 */
@Injectable()
export class DemographicsService {
  private readonly logger = new Logger(DemographicsService.name);
  private readonly encryptionKey: Buffer;
  private readonly algorithm = 'aes-256-gcm';

  constructor(
    @InjectRepository(DebtorDemographics)
    private readonly demographicsRepository: Repository<DebtorDemographics>,
    private readonly profilesService: ProfilesService,
    private readonly requestContext: RequestContext,
    private readonly eventPublisher: EventPublisher, // Added EventPublisher
    private readonly configService: ConfigService,
  ) {
    // Get encryption key from environment or generate a default for development
    const keyString = this.configService.get<string>('SSN_ENCRYPTION_KEY');

    if (!keyString) {
      this.logger.warn(
        'SSN_ENCRYPTION_KEY not set in environment. Using default key for development. ' +
        'THIS IS NOT SECURE FOR PRODUCTION!'
      );
      // Generate a consistent dev key (32 bytes for AES-256)
      this.encryptionKey = crypto.scryptSync('dev-only-key-not-for-production', 'salt', 32);
    } else {
      // In production, key should be a base64-encoded 32-byte key
      this.encryptionKey = Buffer.from(keyString, 'base64');

      if (this.encryptionKey.length !== 32) {
        throw new Error('SSN_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
      }
    }
  }

  /**
   * Find demographics for a debtor
   * 
   * Verifies organization has access and logs the access for audit trail.
   * 
   * @param debtorId - Debtor UUID
   * @param organizationId - Requesting organization UUID
   * @param userId - User making the request (for audit logging)
   * @returns Demographics record
   * @throws UnauthorizedDemographicsAccessException if organization lacks access
   * @throws DemographicsNotFoundException if demographics not found
   */
  async findOne(
    debtorId: string,
  ): Promise<DebtorDemographics> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    const userId = this.requestContext.getUserId();

    // Query with join to verify organization access in single query
    const demographics = await this.demographicsRepository
      .createQueryBuilder('demographics')
      .innerJoin('demographics.debtorProfile', 'profile')
      .where('demographics.debtorProfileId = :debtorId', { debtorId })
      .andWhere('profile.organizationId = :organizationId', { organizationId })
      .andWhere('demographics.deletedAt IS NULL')
      .getOne();

    if (!demographics) {
      throw new DemographicsNotFoundException(debtorId);
    }

    // Update audit trail
    await this.logAccess(demographics.id, userId);

    this.logger.log(
      `Demographics accessed for debtor ${debtorId} by organization ${organizationId}`,
    );

    return demographics;
  }

  /**
   * Create demographics for a debtor
   * 
   * @param debtorId - Debtor UUID
   * @param createDto - Demographics data
   * @param organizationId - Requesting organization UUID
   * @param userId - User making the request (for audit logging)
   * @returns Created demographics record
   * @throws UnauthorizedDemographicsAccessException if organization lacks access
   * @throws DemographicsAlreadyExistsException if demographics already exist
   */
  async create(
    debtorId: string,
    createDto: CreateDemographicsDto,
  ): Promise<DebtorDemographics> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    const userId = this.requestContext.getUserId(); // Get userId from context

    // Verify debtor exists and belongs to organization, and check for existing demographics
    const existing = await this.demographicsRepository
      .createQueryBuilder('demographics')
      .innerJoin('demographics.debtorProfile', 'profile')
      .where('demographics.debtorProfileId = :debtorId', { debtorId })
      .andWhere('profile.organizationId = :organizationId', { organizationId })
      .andWhere('demographics.deletedAt IS NULL')
      .getOne();

    // If no demographics found, verify the profile itself exists for better error messages
    if (!existing) {
      await this.profilesService.findOne(debtorId); // Only call if needed, for existence check
    }

    if (existing) {
      throw new DemographicsAlreadyExistsException(debtorId);
    }

    // Process SSN if provided
    let ssnData: { ssnEncrypted?: string; ssnHash?: string; ssnLastFour?: string } = {};
    if (createDto.ssnEncrypted) {
      try {
        ssnData = this.processSSN(createDto.ssnEncrypted);
        this.logger.log('SSN encrypted successfully for new demographics');
      } catch (error) {
        this.logger.error('Failed to encrypt SSN', error);
        throw new Error('Invalid SSN format');
      }
    } else if (createDto.ssnLastFour) {
      // If only last 4 provided, just store that
      ssnData.ssnLastFour = createDto.ssnLastFour;
    }

    const demographics = this.demographicsRepository.create({
      ...createDto,
      ...ssnData, // Override with processed SSN data
      debtorProfileId: debtorId,
      // Removed organizationId from here
      bankruptcyDate: createDto.bankruptcyDate
        ? new Date(createDto.bankruptcyDate)
        : undefined,
      bankruptcyHistory: createDto.bankruptcyHistory ?? false,
      lastAccessedAt: new Date(),
      lastAccessedBy: userId,
    });

    const saved = await this.demographicsRepository.save(demographics);

    this.logger.log(
      `Demographics created for debtor ${debtorId} by organization ${organizationId}`,
      { userId, sensitiveData: true },
    );

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DemographicsCreated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DEMOGRAPHICS_CREATED,
      {
        demographicsId: saved.id,
        debtorId: profile.debtorIdentityId,
        organizationId,
        createdAt: saved.createdAt.toISOString(),
      },
      DemographicsCreatedDto,
    );

    this.logger.log(`Published DemographicsCreated event for ${saved.id}`);

    return saved;
  }

  /**
   * Full update of demographics
   * 
   * @param debtorId - Debtor UUID
   * @param updateDto - Updated demographics data
   * @param organizationId - Requesting organization UUID
   * @param userId - User making the request (for audit logging)
   * @returns Updated demographics record
   * @throws UnauthorizedDemographicsAccessException if organization lacks access
   * @throws DemographicsNotFoundException if demographics not found
   */
  async update(
    debtorId: string,
    updateDto: UpdateDemographicsDto,
  ): Promise<DebtorDemographics> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    const userId = this.requestContext.getUserId(); // Get userId from context

    // Query with join to verify organization access in single query
    const demographics = await this.demographicsRepository
      .createQueryBuilder('demographics')
      .innerJoin('demographics.debtorProfile', 'profile')
      .where('demographics.debtorProfileId = :debtorId', { debtorId })
      .andWhere('profile.organizationId = :organizationId', { organizationId })
      .andWhere('demographics.deletedAt IS NULL')
      .getOne();

    if (!demographics) {
      throw new DemographicsNotFoundException(debtorId);
    }

    // Process SSN if being updated
    let ssnData: { ssnEncrypted?: string; ssnHash?: string; ssnLastFour?: string } = {};
    if (updateDto.ssnEncrypted) {
      try {
        ssnData = this.processSSN(updateDto.ssnEncrypted);
        this.logger.log('SSN re-encrypted successfully for demographics update');
      } catch (error) {
        this.logger.error('Failed to encrypt SSN during update', error);
        throw new Error('Invalid SSN format');
      }
    }

    Object.assign(demographics, {
      ...updateDto,
      ...ssnData, // Override with processed SSN data if provided
      bankruptcyDate: updateDto.bankruptcyDate
        ? new Date(updateDto.bankruptcyDate)
        : demographics.bankruptcyDate,
      bankruptcyHistory: updateDto.bankruptcyHistory ?? demographics.bankruptcyHistory,
      lastAccessedAt: new Date(),
      lastAccessedBy: userId,
    });

    this.logger.log(
      `Demographics updated for debtor ${debtorId} by organization ${organizationId}`,
      { userId, sensitiveData: true },
    );

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DemographicsUpdated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
      {
        demographicsId: demographics.id,
        debtorId: profile.debtorIdentityId,
        organizationId,
        updatedAt: demographics.updatedAt.toISOString(),
        updatedFields: Object.keys(updateDto),
      },
      DemographicsUpdatedDto,
    );

    this.logger.log(`Published DemographicsUpdated event for ${demographics.id}`);

    return demographics;
  }

  /**
   * Partial update of demographics
   * 
   * Only updates provided fields, leaving others unchanged.
   * 
   * @param debtorId - Debtor UUID
   * @param partialUpdateDto - Partial demographics data
   * @param organizationId - Requesting organization UUID
   * @param userId - User making the request (for audit logging)
   * @returns Updated demographics record
   * @throws UnauthorizedDemographicsAccessException if organization lacks access
   * @throws DemographicsNotFoundException if demographics not found
   */
  async partialUpdate(
    debtorId: string,
    partialUpdateDto: PartialUpdateDemographicsDto,
  ): Promise<DebtorDemographics> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    const userId = this.requestContext.getUserId(); // Get userId from context

    // Query with join to verify organization access in single query
    const demographics = await this.demographicsRepository
      .createQueryBuilder('demographics')
      .innerJoin('demographics.debtorProfile', 'profile')
      .where('demographics.debtorProfileId = :debtorId', { debtorId })
      .andWhere('profile.organizationId = :organizationId', { organizationId })
      .andWhere('demographics.deletedAt IS NULL')
      .getOne();

    if (!demographics) {
      throw new DemographicsNotFoundException(debtorId);
    }

    // Process SSN if being updated
    if (partialUpdateDto.ssnEncrypted) {
      try {
        const ssnData = this.processSSN(partialUpdateDto.ssnEncrypted);
        // Replace the raw SSN in the DTO with processed data
        partialUpdateDto.ssnEncrypted = ssnData.ssnEncrypted;
        (partialUpdateDto as any).ssnHash = ssnData.ssnHash;
        (partialUpdateDto as any).ssnLastFour = ssnData.ssnLastFour;
        this.logger.log('SSN re-encrypted successfully for demographics partial update');
      } catch (error) {
        this.logger.error('Failed to encrypt SSN during partial update', error);
        throw new Error('Invalid SSN format');
      }
    }

    // Only update provided fields
    Object.keys(partialUpdateDto).forEach((key) => {
      const typedKey = key as keyof PartialUpdateDemographicsDto;
      if (partialUpdateDto[typedKey] !== undefined) {
        if (key === 'bankruptcyDate' && partialUpdateDto[typedKey]) {
          (demographics as any)[key] = new Date(partialUpdateDto[typedKey] as string);
        } else {
          (demographics as any)[key] = partialUpdateDto[typedKey];
        }
      }
    });

    // Update audit trail
    demographics.lastAccessedAt = new Date();
    demographics.lastAccessedBy = userId;

    const updated = await this.demographicsRepository.save(demographics);

    this.logger.log(
      `Demographics partially updated for debtor ${debtorId} by organization ${organizationId}`,
      { userId, updatedFields: Object.keys(partialUpdateDto), sensitiveData: true },
    );

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DemographicsUpdated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
      {
        demographicsId: updated.id,
        debtorId: profile.debtorIdentityId,
        organizationId,
        updatedAt: updated.updatedAt.toISOString(),
        updatedFields: Object.keys(partialUpdateDto),
      },
      DemographicsUpdatedDto,
    );

    this.logger.log(`Published DemographicsUpdated event for ${updated.id}`);

    return updated;
  }

  /**
   * Soft delete demographics for a debtor
   * 
   * @param debtorId - Debtor UUID
   * @param organizationId - Requesting organization UUID
   * @param userId - User making the request (for audit logging)
   * @throws UnauthorizedDemographicsAccessException if organization lacks access
   * @throws DemographicsNotFoundException if demographics not found
   */
  async remove(
    debtorId: string,
  ): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }
    const userId = this.requestContext.getUserId(); // Get userId from context

    // Query with join to verify organization access in single query
    const demographics = await this.demographicsRepository
      .createQueryBuilder('demographics')
      .innerJoin('demographics.debtorProfile', 'profile')
      .where('demographics.debtorProfileId = :debtorId', { debtorId })
      .andWhere('profile.organizationId = :organizationId', { organizationId })
      .andWhere('demographics.deletedAt IS NULL')
      .getOne();

    if (!demographics) {
      throw new DemographicsNotFoundException(debtorId);
    }

    // Perform soft delete by setting deletedAt timestamp
    const deletedAt = new Date();
    await this.demographicsRepository.update(demographics.id, {
      deletedAt,
    });

    this.logger.log(
      `Demographics soft deleted for debtor ${debtorId} by organization ${organizationId}`,
      { userId, sensitiveData: true },
    );

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorId);

    // Publish DemographicsUpdated event (as soft delete is an update)
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_DEMOGRAPHICS_UPDATED,
      {
        demographicsId: demographics.id,
        debtorId: profile.debtorIdentityId,
        organizationId,
        updatedAt: deletedAt.toISOString(),
        updatedFields: ['deletedAt'],
      },
      DemographicsUpdatedDto,
    );

    this.logger.log(`Published DemographicsUpdated event for soft delete of demographics ${demographics.id}`);
  }
  // ========== Helper Methods ==========

  /**
   * Log access to demographics for audit trail
   * 
   * Updates lastAccessedAt and lastAccessedBy fields.
   * 
   * @param demographicsId - Demographics record UUID
   * @param userId - User making the access
   */
  private async logAccess(
    demographicsId: string,
    userId?: string,
  ): Promise<void> {
    await this.demographicsRepository.update(demographicsId, {
      lastAccessedAt: new Date(),
      lastAccessedBy: userId,
    });

    // TODO: Also log to external audit system for compliance
    // await this.auditService.logDemographicsAccess(demographicsId, userId);
  }

  /**
   * Check if demographics exist for a debtor
   *
   * @param debtorId - Debtor UUID
   * @returns True if demographics exist
   */
  async exists(debtorId: string): Promise<boolean> {
    const count = await this.demographicsRepository.count({
      where: { debtorProfileId: debtorId, deletedAt: IsNull() },
    });
    return count > 0;
  }

  // ========== SSN Encryption/Decryption Methods ==========

  /**
   * Encrypt SSN using AES-256-GCM
   *
   * Format: IV:AuthTag:Ciphertext (all base64 encoded)
   *
   * @param ssn - Raw SSN string (can include hyphens)
   * @returns Encrypted SSN string
   */
  private encryptSSN(ssn: string): string {
    if (!ssn || ssn.trim() === '') {
      throw new Error('SSN cannot be empty');
    }

    // Remove any non-digit characters (hyphens, spaces, etc.)
    const cleanSSN = ssn.replace(/\D/g, '');

    if (cleanSSN.length !== 9) {
      throw new Error('SSN must be exactly 9 digits');
    }

    // Generate a random IV (12 bytes is recommended for GCM)
    const iv = crypto.randomBytes(12);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    // Encrypt the SSN
    let encrypted = cipher.update(cleanSSN, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Get authentication tag
    const authTag = cipher.getAuthTag().toString('base64');

    // Return format: IV:AuthTag:Ciphertext
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Decrypt SSN
   *
   * @param encryptedSSN - Encrypted SSN string in format IV:AuthTag:Ciphertext
   * @returns Decrypted SSN string (9 digits)
   */
  private decryptSSN(encryptedSSN: string): string {
    if (!encryptedSSN || encryptedSSN.trim() === '') {
      throw new Error('Encrypted SSN cannot be empty');
    }

    try {
      // Parse the encrypted string
      const parts = encryptedSSN.split(':');
      if (parts.length !== 3) {
        throw new Error('Invalid encrypted SSN format');
      }

      const [ivBase64, authTagBase64, encryptedBase64] = parts;

      // Convert from base64
      const iv = Buffer.from(ivBase64, 'base64');
      const authTag = Buffer.from(authTagBase64, 'base64');
      const encrypted = Buffer.from(encryptedBase64, 'base64');

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return decrypted.toString('utf8');
    } catch (error) {
      this.logger.error('Failed to decrypt SSN', error);
      throw new Error('SSN decryption failed');
    }
  }

  /**
   * Create SHA-256 hash of SSN for deduplication
   *
   * @param ssn - Raw SSN string
   * @returns SHA-256 hash (hex string)
   */
  private hashSSN(ssn: string): string {
    if (!ssn || ssn.trim() === '') {
      throw new Error('SSN cannot be empty');
    }

    // Remove any non-digit characters
    const cleanSSN = ssn.replace(/\D/g, '');

    if (cleanSSN.length !== 9) {
      throw new Error('SSN must be exactly 9 digits');
    }

    return crypto.createHash('sha256').update(cleanSSN).digest('hex');
  }

  /**
   * Extract last 4 digits from SSN
   *
   * @param ssn - Raw SSN string
   * @returns Last 4 digits
   */
  private extractLastFour(ssn: string): string {
    if (!ssn || ssn.trim() === '') {
      throw new Error('SSN cannot be empty');
    }

    // Remove any non-digit characters
    const cleanSSN = ssn.replace(/\D/g, '');

    if (cleanSSN.length !== 9) {
      throw new Error('SSN must be exactly 9 digits');
    }

    return cleanSSN.slice(-4);
  }

  /**
   * Process SSN for storage (encrypt, hash, extract last 4)
   *
   * @param rawSSN - Raw SSN string
   * @returns Object with encrypted SSN, hash, and last 4 digits
   */
  private processSSN(rawSSN: string): {
    ssnEncrypted: string;
    ssnHash: string;
    ssnLastFour: string;
  } {
    return {
      ssnEncrypted: this.encryptSSN(rawSSN),
      ssnHash: this.hashSSN(rawSSN),
      ssnLastFour: this.extractLastFour(rawSSN),
    };
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { DebtorIdentityService } from '../identity/identity.service';
import { ProfilesService } from '../profiles/profiles.service';
import { DebtorAddressService } from '../contact/services/address.service';
import { DebtorEmailService } from '../contact/services/email.service';
import { DebtorPhoneService } from '../contact/services/phone.service';
import { ImportBatchCompletedDto } from '../events/event-dto/debtors/import-batch-completed.dto';
import { PortfolioDebtorBatchReadyDto } from '../events/event-dto/debts/portfolio-debtor-batch-ready.dto';

/**
 * Debtor Import Processor Service
 *
 * SINGLE RESPONSIBILITY: Process debtor data from portfolio imports
 *
 * This service handles:
 * - Batch processing of imported debtor data
 * - Orchestrating identity matching (via IdentityService)
 * - Orchestrating profile creation (via ProfilesService)
 * - Orchestrating contact info creation (via ContactModule)
 * - Publishing batch completion events
 * - Retry logic for failed debtors
 * - Progress tracking
 *
 * Event Flow:
 * 1. SUBSCRIBES TO: debts.portfolio.import_started
 * 2. Processes debtors in batches (100-2,000 per batch)
 * 3. PUBLISHES: debtors.import_batch.completed (per batch)
 * 4. When all batches complete: import job is done
 *
 * Batch Processing Logic:
 * - Dynamic batch sizing based on total debtors
 * - 5 parallel batch workers (configurable)
 * - Idempotent via debtorKey hashing
 * - Retries up to 3 times on failure
 *
 * MVP Scope:
 * - Email or SSN exact match for identity deduplication
 * - Creates DebtorProfile even if identity exists
 * - Creates contact info if provided in import data
 * - Defers fuzzy matching to post-MVP
 */
@Injectable()
export class DebtorImportProcessor {
  private readonly logger = new Logger(DebtorImportProcessor.name);

  constructor(
    private readonly identityService: DebtorIdentityService,
    private readonly profilesService: ProfilesService,
    private readonly addressService: DebtorAddressService,
    private readonly emailService: DebtorEmailService,
    private readonly phoneService: DebtorPhoneService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Process a batch of debtors from a PortfolioDebtorBatchReady event.
   *
   * This is the entry point for event-driven batch processing.
   * Transforms the event DTO into the internal batch format and delegates
   * to processBatch().
   *
   * @param eventData - The PortfolioDebtorBatchReady event data
   * @returns Batch processing results
   */
  async processBatchFromEvent(
    eventData: PortfolioDebtorBatchReadyDto,
  ): Promise<{
    importJobId: string;
    portfolioId: string;
    organizationId: string;
    batchNumber: number;
    totalBatches: number;
    debtorMappings: {
      debtorKey: string;
      debtorIdentityId: string;
      debtorProfileId: string;
      debtIds: string[];
      isNewIdentity: boolean;
      isNewProfile: boolean;
    }[];
    errors: {
      debtorKey: string;
      error: string;
      debtIds: string[];
      willRetry: boolean;
    }[];
    processedAt: string;
  }> {
    const { importJobId, portfolioId, organizationId, batchNumber, totalBatches, debtors } = eventData;

    this.logger.log(
      `Transforming event data for batch ${batchNumber}/${totalBatches}`,
      { debtorCount: debtors.length },
    );

    // Transform event DTO debtors into internal batch format
    const transformedDebtors = debtors.map((debtor) => {
      // Generate debtorKey for idempotency (same logic as api-debts)
      const debtorKey = debtor.email
        ? debtor.email.toLowerCase()
        : `${debtor.firstName}_${debtor.lastName}_${debtor.addressLine1}_${debtor.zipCode}`.toLowerCase();

      return {
        debtorKey,
        firstName: debtor.firstName || '',
        lastName: debtor.lastName || '',
        middleName: debtor.middleName,
        dateOfBirth: debtor.dateOfBirth,
        ssn: debtor.ssn,
        email: debtor.email,
        phone: debtor.phone,
        address: debtor.addressLine1
          ? {
              streetLine1: debtor.addressLine1,
              streetLine2: debtor.addressLine2,
              city: debtor.city || '',
              state: debtor.state || '',
              postalCode: debtor.zipCode || '',
            }
          : undefined,
        debtIds: debtor.debtIds,
      };
    });

    // Delegate to core batch processing logic
    return this.processBatch({
      importJobId,
      portfolioId,
      organizationId,
      batchNumber,
      totalBatches,
      debtors: transformedDebtors,
    });
  }

  /**
   * Process a batch of debtors from an import job.
   *
   * This is the main entry point for batch processing.
   *
   * @param batchData - Batch of debtor data to process
   * @returns Batch processing results
   */
  async processBatch(batchData: {
    importJobId: string;
    portfolioId: string;
    organizationId: string;
    batchNumber: number;
    totalBatches: number;
    debtors: {
      debtorKey: string; // Idempotency key
      firstName: string;
      lastName: string;
      email?: string;
      phone?: string;
      address?: {
        streetLine1: string;
        streetLine2?: string;
        city: string;
        state: string;
        postalCode: string;
      };
      dateOfBirth?: string;
      ssn?: string; // Will be hashed
      debtIds: string[]; // Associated debt IDs
    }[];
  }): Promise<{
    importJobId: string;
    portfolioId: string;
    organizationId: string;
    batchNumber: number;
    totalBatches: number;
    debtorMappings: {
      debtorKey: string;
      debtorIdentityId: string;
      debtorProfileId: string;
      debtIds: string[];
      isNewIdentity: boolean;
      isNewProfile: boolean;
    }[];
    errors: {
      debtorKey: string;
      error: string;
      debtIds: string[];
      willRetry: boolean;
    }[];
    processedAt: string;
  }> {
    this.logger.log(
      `Processing batch ${batchData.batchNumber}/${batchData.totalBatches} for import ${batchData.importJobId}`,
      {
        debtorCount: batchData.debtors.length,
        organizationId: batchData.organizationId,
      },
    );

    const debtorMappings: {
      debtorKey: string;
      debtorIdentityId: string;
      debtorProfileId: string;
      debtIds: string[];
      isNewIdentity: boolean;
      isNewProfile: boolean;
    }[] = [];

    const errors: {
      debtorKey: string;
      error: string;
      debtIds: string[];
      willRetry: boolean;
    }[] = [];

    // Process each debtor in the batch
    for (const debtorData of batchData.debtors) {
      try {
        const result = await this.processDebtor(
          debtorData,
          batchData.organizationId,
        );

        debtorMappings.push({
          debtorKey: debtorData.debtorKey,
          debtorIdentityId: result.identityId,
          debtorProfileId: result.profileId,
          debtIds: debtorData.debtIds,
          isNewIdentity: result.isNewIdentity,
          isNewProfile: result.isNewProfile,
        });

        this.logger.debug(`Processed debtor ${debtorData.debtorKey}`, {
          identityId: result.identityId,
          profileId: result.profileId,
          isNewIdentity: result.isNewIdentity,
          isNewProfile: result.isNewProfile,
        });
      } catch (error: any) {
        this.logger.error(
          `Failed to process debtor ${debtorData.debtorKey}`,
          error.stack,
        );

        errors.push({
          debtorKey: debtorData.debtorKey,
          error: error.message || 'Unknown error',
          debtIds: debtorData.debtIds,
          willRetry: this.shouldRetry(error),
        });
      }
    }

    const result = {
      importJobId: batchData.importJobId,
      portfolioId: batchData.portfolioId,
      organizationId: batchData.organizationId,
      batchNumber: batchData.batchNumber,
      totalBatches: batchData.totalBatches,
      debtorMappings,
      errors,
      processedAt: new Date().toISOString(),
    };

    this.logger.log(
      `Batch ${batchData.batchNumber}/${batchData.totalBatches} complete`,
      {
        successCount: debtorMappings.length,
        errorCount: errors.length,
      },
    );

    // Publish import_batch.completed event
    const eventDto: ImportBatchCompletedDto = {
      importJobId: batchData.importJobId,
      organizationId: batchData.organizationId,
      portfolioId: batchData.portfolioId,
      batchNumber: batchData.batchNumber,
      totalProcessed: batchData.debtors.length,
      successCount: debtorMappings.length,
      failureCount: errors.length,
      debtorMappings,
      errors,
      completedAt: result.processedAt,
    };

    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_IMPORT_BATCH_COMPLETED,
      eventDto,
      ImportBatchCompletedDto,
    );

    this.logger.debug('Published import_batch.completed event', {
      importJobId: batchData.importJobId,
      batchNumber: batchData.batchNumber,
      successCount: debtorMappings.length,
      errorCount: errors.length,
    });

    return result;
  }

  /**
   * Process a single debtor.
   *
   * Steps:
   * 1. Find or create DebtorIdentity (using email or SSN match)
   * 2. Find or create DebtorProfile for this organization
   * 3. Create contact information if provided
   *
   * @param debtorData - Debtor data to process
   * @param organizationId - Organization this debtor belongs to
   * @returns Processing result
   */
  private async processDebtor(
    debtorData: {
      debtorKey: string;
      firstName: string;
      lastName: string;
      middleName?: string;
      email?: string;
      phone?: string;
      address?: {
        streetLine1: string;
        streetLine2?: string;
        city: string;
        state: string;
        postalCode: string;
      };
      dateOfBirth?: string;
      ssn?: string;
    },
    organizationId: string,
  ): Promise<{
    identityId: string;
    profileId: string;
    isNewIdentity: boolean;
    isNewProfile: boolean;
  }> {
    // Step 1: Find or create identity
    const ssnHash = debtorData.ssn
      ? this.identityService.generateSsnHash(debtorData.ssn)
      : undefined;

    const { identity, isNew: isNewIdentity } =
      await this.identityService.findOrCreateIdentity({
        email: debtorData.email,
        ssnHash,
      });

    this.logger.debug(
      `${isNewIdentity ? 'Created new' : 'Found existing'} identity for ${debtorData.debtorKey}`,
      { identityId: identity.id },
    );

    // Step 2: Find or create profile
    const { profile, isNew: isNewProfile } =
      await this.profilesService.findOrCreateProfile(
        identity.id,
        organizationId,
        {
          firstName: debtorData.firstName,
          lastName: debtorData.lastName,
          middleName: debtorData.middleName,
          dateOfBirth: debtorData.dateOfBirth,
        },
      );

    this.logger.debug(
      `${isNewProfile ? 'Created new' : 'Found existing'} profile for ${debtorData.debtorKey}`,
      { profileId: profile.id },
    );

    // Step 3: Create contact information if provided (only for new profiles)
    if (isNewProfile) {
      if (debtorData.email) {
        await this.emailService.create(profile.id, {
          email: debtorData.email,
          isPrimary: true,
        });
        this.logger.debug(`Created email for profile ${profile.id}`);
      }

      if (debtorData.phone) {
        await this.phoneService.create(profile.id, {
          phoneNumber: debtorData.phone,
          isPrimary: true,
        });
        this.logger.debug(`Created phone for profile ${profile.id}`);
      }

      if (debtorData.address) {
        await this.addressService.create(profile.id, {
          street1: debtorData.address.streetLine1,
          street2: debtorData.address.streetLine2,
          city: debtorData.address.city,
          state: debtorData.address.state,
          postalCode: debtorData.address.postalCode,
          isPrimary: true,
        });
        this.logger.debug(`Created address for profile ${profile.id}`);
      }
    }

    return {
      identityId: identity.id,
      profileId: profile.id,
      isNewIdentity,
      isNewProfile,
    };
  }

  /**
   * Calculate optimal batch size based on total debtor count.
   *
   * Batch sizing strategy:
   * - < 1,000 debtors: 100 per batch
   * - 1,000 - 10,000: 500 per batch
   * - 10,000 - 50,000: 1,000 per batch
   * - > 50,000: 2,000 per batch
   *
   * @param totalDebtors - Total number of debtors to process
   * @returns Optimal batch size
   */
  calculateBatchSize(totalDebtors: number): number {
    if (totalDebtors < 1000) return 100;
    if (totalDebtors < 10000) return 500;
    if (totalDebtors < 50000) return 1000;
    return 2000;
  }

  /**
   * Determine if an error should trigger a retry.
   *
   * Retryable errors:
   * - Network failures
   * - Database deadlocks
   * - Temporary service unavailability
   * - Timeout errors
   *
   * Non-retryable errors:
   * - Validation errors
   * - Constraint violations (unique, foreign key, etc.)
   * - Invalid data format
   * - Business logic errors
   *
   * @param error - The error that occurred
   * @returns True if should retry
   */
  private shouldRetry(error: any): boolean {
    if (!error) return false;

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Non-retryable: Validation errors
    if (
      errorMessage.includes('validation') ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('required field')
    ) {
      return false;
    }

    // Non-retryable: Database constraint violations
    if (
      errorCode === '23505' || // Unique constraint violation
      errorCode === '23503' || // Foreign key violation
      errorCode === '23502' || // Not null violation
      errorMessage.includes('duplicate key') ||
      errorMessage.includes('violates foreign key') ||
      errorMessage.includes('violates check constraint')
    ) {
      return false;
    }

    // Non-retryable: Business logic errors (custom exceptions)
    if (
      errorMessage.includes('already exists') ||
      errorMessage.includes('not found') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden')
    ) {
      return false;
    }

    // Retryable: Network and connection errors
    if (
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ETIMEDOUT' ||
      errorCode === 'ENOTFOUND' ||
      errorMessage.includes('network') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('timeout')
    ) {
      return true;
    }

    // Retryable: Database deadlocks and lock timeouts
    if (
      errorCode === '40P01' || // Deadlock detected
      errorCode === '55P03' || // Lock not available
      errorMessage.includes('deadlock') ||
      errorMessage.includes('lock timeout')
    ) {
      return true;
    }

    // Retryable: Service unavailable
    if (
      errorMessage.includes('service unavailable') ||
      errorMessage.includes('temporarily unavailable') ||
      errorMessage.includes('too many requests')
    ) {
      return true;
    }

    // Default: Non-retryable for safety
    // Log unexpected errors for investigation
    this.logger.warn('Unexpected error type - marking as non-retryable', {
      errorMessage,
      errorCode,
      errorType: error.constructor?.name,
    });
    return false;
  }

  /**
   * Split debtors into batches.
   *
   * @param debtors - All debtors to process
   * @param batchSize - Size of each batch
   * @returns Array of batches
   */
  splitIntoBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }
}

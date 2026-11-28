import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VerificationRequest } from './entities/verification.entity';
import { CreateVerificationRequestDto } from './dto/create-verification-request.dto';
import { QueryVerificationRequestsDto } from './dto/query-verification-requests.dto';
import { VerificationResultDto } from './dto/verification-result.dto';
import { ProfilesService } from '../profiles/profiles.service';
import {
  VerificationNotFoundException,
  VerificationProviderErrorException,
  VerificationAlreadyInProgressException,
} from './errors';
import { AddressVerificationProvider } from './providers/address-verification.provider';
import { PhoneVerificationProvider } from './providers/phone-verification.provider';
import { EmailVerificationProvider } from './providers/email-verification.provider';
import { SkipTraceProvider } from './providers/skip-trace.provider';
import { RequestContext } from '../core/services/request-context.service';
import { EventPublisher } from '@verichron/event-publisher'; // Added import
import { EVENT_TYPES  } from '@verichron/events'; // Added import
import { VerificationRequestStatus } from '@verichron/enums';
import {
  VerificationRequestedDto,
  VerificationCompletedDto,
  VerificationFailedDto,
} from '../events/event-dto'; // Corrected import path

/**
 * Verification Service
 * 
 * Orchestrates verification requests and integrates with third-party providers.
 * 
 * Features:
 * - Multiple verification types (address, phone, email, skip trace, etc.)
 * - Provider abstraction via interface
 * - Status tracking and history
 * - Retry mechanism for failed verifications
 * - Event-driven processing
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    @InjectRepository(VerificationRequest)
    private readonly verificationRepository: Repository<VerificationRequest>,
    private readonly profilesService: ProfilesService,
    private readonly addressVerificationProvider: AddressVerificationProvider,
    private readonly phoneVerificationProvider: PhoneVerificationProvider,
    private readonly emailVerificationProvider: EmailVerificationProvider,
    private readonly skipTraceProvider: SkipTraceProvider,
    private readonly requestContext: RequestContext,
    private readonly eventPublisher: EventPublisher, // Added EventPublisher
  ) {}

  /**
   * Find all verification requests for a debtor profile
   */
  async findAll(
    debtorProfileId: string,
    query: QueryVerificationRequestsDto,
  ): Promise<{
    data: VerificationRequest[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const {
      verificationType,
      status,
      requestedAfter,
      requestedBefore,
      sortBy = 'requestedAt',
      sortDirection = 'DESC',
      page = 1,
      pageSize = 20,
    } = query;

    const queryBuilder = this.verificationRepository
      .createQueryBuilder('verification')
      .where('verification.debtorProfileId = :debtorProfileId', { debtorProfileId })
      .andWhere('verification.organizationId = :organizationId', {
        organizationId,
      });

    // Apply filters
    if (verificationType) {
      queryBuilder.andWhere('verification.verificationType = :verificationType', {
        verificationType,
      });
    }

    if (status) {
      queryBuilder.andWhere('verification.status = :status', { status });
    }

    if (requestedAfter) {
      queryBuilder.andWhere('verification.requestedAt >= :requestedAfter', {
        requestedAfter: new Date(requestedAfter),
      });
    }

    if (requestedBefore) {
      queryBuilder.andWhere('verification.requestedAt <= :requestedBefore', {
        requestedBefore: new Date(requestedBefore),
      });
    }

    // Apply sorting
    queryBuilder.orderBy(`verification.${sortBy}`, sortDirection);

    // Apply pagination
    const skip = (page - 1) * pageSize;
    queryBuilder.skip(skip).take(pageSize);

    // Execute query
    const [data, total] = await queryBuilder.getManyAndCount();

    this.logger.log(
      `Found ${data.length} of ${total} verification requests for debtor profile ${debtorProfileId}`,
    );

    return { data, total, page, pageSize };
  }

  /**
   * Find one verification request
   */
  async findOne(
    verificationId: string,
    debtorProfileId: string,
  ): Promise<VerificationRequest> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId, debtorProfileId, organizationId },
    });

    if (!verification) {
      throw new VerificationNotFoundException(verificationId);
    }

    return verification;
  }

  /**
   * Request a new verification
   *
   * Creates a verification request and triggers processing.
   */
  async requestVerification(
    debtorProfileId: string,
    createDto: CreateVerificationRequestDto,
  ): Promise<VerificationRequest> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    // Check for existing in-progress verification of same type
    const existing = await this.verificationRepository.findOne({
      where: {
        debtorProfileId,
        organizationId,
        verificationType: createDto.verificationType,
        status: VerificationRequestStatus.IN_PROGRESS,
      },
    });

    if (existing) {
      throw new VerificationAlreadyInProgressException(
        debtorProfileId,
        createDto.verificationType,
      );
    }

    // Create verification request
    const verification = this.verificationRepository.create({
      debtorProfileId,
      organizationId,
      verificationType: createDto.verificationType,
      inputData: createDto.inputData,
      metadata: createDto.metadata,
      status: VerificationRequestStatus.PENDING,
      requestedBy: userId,
      requestedAt: new Date(),
      retryCount: 0,
      verified: false,
    });

    const saved = await this.verificationRepository.save(verification);

    this.logger.log(
      `Verification request ${saved.id} created for debtor profile ${debtorProfileId}`,
    );

    // Fetch the profile to get debtorIdentityId for the event
    const profile = await this.profilesService.findOne(debtorProfileId);

    // Publish VerificationRequested event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_REQUESTED,
      {
        verificationId: saved.id,
        debtorId: profile.debtorIdentityId,
        debtorProfileId: saved.debtorProfileId,
        organizationId: saved.organizationId,
        verificationType: saved.verificationType,
        inputData: saved.inputData,
        requestedBy: saved.requestedBy,
        requestedAt: saved.requestedAt.toISOString(),
      },
      VerificationRequestedDto,
    );

    this.logger.log(`Published VerificationRequested event for ${saved.id}`);

    // Trigger async processing
    // In production, this would publish an event to a queue
    // For now, process immediately in background
    this.processVerification(saved.id).catch((error) => {
      this.logger.error(
        `Failed to process verification ${saved.id}: ${error.message}`,
        error.stack,
      );
    });

    return saved;
  }

  /**
   * Process a verification request
   * 
   * Orchestrates the verification through the appropriate provider.
   */
  async processVerification(verificationId: string): Promise<void> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new VerificationNotFoundException(verificationId);
    }

    // Update status to IN_PROGRESS
    verification.status = VerificationRequestStatus.IN_PROGRESS;
    verification.startedAt = new Date();
    await this.verificationRepository.save(verification);

    try {
      // Get appropriate provider
      const provider = this.getProvider(verification.verificationType);

      this.logger.log(
        `Processing ${verification.verificationType} verification ${verificationId} with provider ${provider.getProviderName()}`,
      );

      // Call provider
      const result = await provider.verify(verification.inputData);

      // Update verification with result
      const completedVerification = await this.completeVerification(verificationId, result);

      this.logger.log(
        `Verification ${verificationId} completed: ${result.verified ? 'VERIFIED' : 'FAILED'}`,
      );

      // Fetch the profile to get debtorIdentityId for the event
      const profile = await this.profilesService.findOne(completedVerification.debtorProfileId);

      // Publish VerificationCompleted event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_COMPLETED,
        {
          verificationId: completedVerification.id,
          debtorId: profile.debtorIdentityId,
          organizationId: completedVerification.organizationId,
          verificationType: completedVerification.verificationType,
          verified: completedVerification.verified,
          result: completedVerification.result || {},
          provider: completedVerification.provider || 'unknown',
          confidenceScore: completedVerification.confidenceScore,
          costCents: completedVerification.costCents,
          completedAt: completedVerification.completedAt?.toISOString() || new Date().toISOString(),
        },
        VerificationCompletedDto,
      );

      this.logger.log(`Published VerificationCompleted event for ${completedVerification.id}`);

      // TODO: Update related entities (e.g., mark debtor address as verified)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorStack = error instanceof Error ? error.stack : undefined;
      const errorCode = (error && typeof error === 'object' && 'code' in error)
        ? String(error.code)
        : 'UNKNOWN_ERROR';

      this.logger.error(
        `Verification ${verificationId} error: ${errorMessage}`,
        errorStack,
      );

      // Update verification with error
      verification.status = VerificationRequestStatus.ERROR;
      verification.errorMessage = errorMessage;
      verification.errorCode = errorCode;
      verification.completedAt = new Date();
      const updatedVerification = await this.verificationRepository.save(verification);

      // Fetch the profile to get debtorIdentityId for the event
      const profile = await this.profilesService.findOne(updatedVerification.debtorProfileId);

      // Publish VerificationFailed event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTORS_VERIFICATIONS_VERIFICATION_FAILED,
        {
          verificationId: updatedVerification.id,
          debtorId: profile.debtorIdentityId,
          organizationId: updatedVerification.organizationId,
          verificationType: updatedVerification.verificationType,
          errorMessage: updatedVerification.errorMessage || 'Unknown error',
          errorCode: updatedVerification.errorCode || 'UNKNOWN_ERROR',
          retryCount: updatedVerification.retryCount,
          failedAt: updatedVerification.completedAt?.toISOString() || new Date().toISOString(),
        },
        VerificationFailedDto,
      );

      this.logger.log(`Published VerificationFailed event for ${verification.id}`);
    }
  }

  /**
   * Complete a verification with results
   */
  async completeVerification(
    verificationId: string,
    result: VerificationResultDto,
  ): Promise<VerificationRequest> {
    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new VerificationNotFoundException(verificationId);
    }

    verification.status = result.verified ? VerificationRequestStatus.VERIFIED : VerificationRequestStatus.FAILED;
    verification.verified = result.verified;
    verification.result = result.details;
    verification.confidenceScore = result.confidence;
    verification.provider = result.provider;
    verification.costCents = result.costCents;
    verification.errorMessage = result.errorMessage;
    verification.errorCode = result.errorCode;
    verification.completedAt = new Date();

    const updated = await this.verificationRepository.save(verification);

    this.logger.log(
      `Verification ${verificationId} completed with status ${updated.status}`,
    );

    return updated;
  }

  /**
   * Retry a failed verification
   */
  async retryVerification(
    verificationId: string,
    debtorProfileId: string,
  ): Promise<VerificationRequest> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const verification = await this.verificationRepository.findOne({
      where: { id: verificationId, debtorProfileId, organizationId },
    });

    if (!verification) {
      throw new VerificationNotFoundException(verificationId);
    }

    // Can only retry failed or error verifications
    if (verification.status !== VerificationRequestStatus.FAILED && verification.status !== VerificationRequestStatus.ERROR) {
      throw new Error(
        `Cannot retry verification with status ${verification.status}`,
      );
    }

    // Increment retry count
    verification.retryCount += 1;
    verification.status = VerificationRequestStatus.PENDING;
    verification.errorMessage = undefined;
    verification.errorCode = undefined;
    await this.verificationRepository.save(verification);

    this.logger.log(
      `Retrying verification ${verificationId} (attempt ${verification.retryCount})`,
    );

    // Trigger processing
    this.processVerification(verificationId).catch((error) => {
      this.logger.error(
        `Failed to retry verification ${verificationId}: ${error.message}`,
        error.stack,
      );
    });

    return verification;
  }

  /**
   * Get verification statistics for a debtor profile
   */
  async getStatistics(
    debtorProfileId: string,
  ): Promise<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
  }> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const verifications = await this.verificationRepository.find({
      where: { debtorProfileId, organizationId },
    });

    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};

    verifications.forEach((v) => {
      byStatus[v.status] = (byStatus[v.status] || 0) + 1;
      byType[v.verificationType] = (byType[v.verificationType] || 0) + 1;
    });

    return {
      total: verifications.length,
      byStatus,
      byType,
    };
  }

  // ========== Helper Methods ==========

  /**
   * Get the appropriate provider for a verification type
   */
  private getProvider(verificationType: string): any {
    switch (verificationType) {
      case 'ADDRESS_VERIFICATION':
        return this.addressVerificationProvider;
      case 'PHONE_VERIFICATION':
        return this.phoneVerificationProvider;
      case 'EMAIL_VERIFICATION':
        return this.emailVerificationProvider;
      case 'SKIP_TRACE':
        return this.skipTraceProvider;
      case 'SSN_VERIFICATION':
      case 'IDENTITY_VERIFICATION':
      case 'EMPLOYMENT_VERIFICATION':
        // TODO: Implement these providers
        throw new VerificationProviderErrorException(
          verificationType,
          'Provider not yet implemented',
        );
      default:
        throw new VerificationProviderErrorException(
          verificationType,
          'Unknown verification type',
        );
    }
  }

}
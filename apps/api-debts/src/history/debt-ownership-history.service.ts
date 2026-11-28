import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, IsNull } from 'typeorm';
import { DebtOwnershipHistory } from './entities/debt-ownership-history.entity';
import { Debt } from '../debts/entities/debt.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { CreateOwnershipHistoryDto } from './dto/create-ownership-history.dto';
import { QueryHistoryDto } from './dto/ownership-history-response.dto';
import { SortOrder } from '@verichron/enums';
import {
  OwnershipHistoryResponseDto,
  DebtOwnershipChainResponseDto,
} from './dto/ownership-history-response.dto';
import {
  DebtNotFoundForHistoryException,
  InvalidHistoryDateRangeException,
  MultipleCurrentOwnersException,
} from './errors';
import { RequestContext } from '../core';

/**
 * Service responsible for debt ownership history management.
 * 
 * Core Responsibilities:
 * - Query ownership history for debts (chain of title)
 * - Create new ownership history records (called by other modules)
 * - Close ownership records during transfers (set soldDate)
 * - Validate chronological integrity
 * - Provide audit trail for legal compliance
 * 
 * Key Characteristics:
 * - **Append-only**: Records are never deleted
 * - **Immutable**: Once created, records are not modified (except soldDate)
 * - **Legal defensibility**: Provides complete chain of title
 * - **Integration point**: Used by imports and portfolios modules
 * 
 * Dependencies:
 * - Debt entity (from debts module): For validation
 * - PortfoliosService (from portfolios module): For Layer 2 authorization
 * 
 * Exports:
 * - All methods exported for use by imports and portfolios modules
 */
@Injectable()
export class HistoryService {
  private readonly logger = new Logger(HistoryService.name);

  constructor(
    @InjectRepository(DebtOwnershipHistory)
    private readonly historyRepository: Repository<DebtOwnershipHistory>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    @InjectRepository(UserPortfolioPermission)
    private readonly userPortfolioPermissionRepository: Repository<UserPortfolioPermission>,
    private readonly dataSource: DataSource,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Get complete ownership history for a debt (chain of title).
   *
   * This is the primary query method exposed via the public API.
   *
   * Security:
   * - Verifies debt exists
   * - Verifies user has access to the debt (Layer 2 authorization via portfolio)
   *
   * @param debtId - Debt ID
   * @param query - Query parameters (sorting)
   * @returns Complete ownership chain with computed fields
   * @throws DebtNotFoundForHistoryException if debt not found or no access
   */
  async findDebtHistory(
    debtId: string,
    query: QueryHistoryDto,
  ): Promise<DebtOwnershipChainResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Fetching ownership history for debt ${debtId}`, {
      organizationId,
      userId,
    });

    // Verify debt exists
    const debt = await this.debtRepository.findOne({
      where: { id: debtId, organizationId },
    });

    if (!debt) {
      throw new DebtNotFoundForHistoryException(debtId);
    }

    // Layer 2 authorization: Check portfolio access
    const hasAccess = await this.userPortfolioPermissionRepository.findOne({
      where: { userId, portfolioId: debt.portfolioId },
    });

    if (!hasAccess) {
      this.logger.warn(`User ${userId} denied access to debt ${debtId} history`, {
        portfolioId: debt.portfolioId,
      });
      throw new DebtNotFoundForHistoryException(debtId);
    }

    // Fetch all history records for this debt
    const order = query.order === SortOrder.DESC ? 'DESC' : 'ASC';
    const records = await this.historyRepository.find({
      where: { debtId },
      order: { acquiredDate: order },
    });

    if (records.length === 0) {
      this.logger.warn(`No ownership history found for debt ${debtId}`, {
        debtId,
        organizationId,
      });
    }

    // Find current owner (record with soldDate = null)
    const currentOwnerRecord = records.find((r) => r.soldDate === null);
    const currentOwnerId = currentOwnerRecord?.organizationId ?? null;

    // Data integrity check: Should only be one current owner
    const currentOwnerCount = records.filter((r) => r.soldDate === null).length;
    if (currentOwnerCount > 1) {
      this.logger.error('Data integrity violation: Multiple current owners detected', {
        debtId,
        currentOwnerCount,
      });
      throw new MultipleCurrentOwnersException(debtId, currentOwnerCount);
    }

    const history = records.map((record) =>
      OwnershipHistoryResponseDto.fromEntity(record),
    );

    return {
      debtId,
      history,
      totalTransfers: records.length - 1, // Number of transfers (n records = n-1 transfers)
      currentOwnerId,
    };
  }

  /**
   * Create a new ownership history record.
   * 
   * **Internal Use**: Called by imports and portfolios modules.
   * Not exposed via public API endpoints.
   * 
   * Validation:
   * - Validates soldDate >= acquiredDate if both provided
   * - Validates acquiredDate is not in future
   * - Logs creation for audit trail
   * 
   * @param dto - Ownership history data
   * @returns Created history record
   * @throws InvalidHistoryDateRangeException if dates are invalid
   */
  async createHistoryRecord(
    dto: CreateOwnershipHistoryDto,
  ): Promise<OwnershipHistoryResponseDto> {
    this.logger.log('Creating ownership history record', {
      debtId: dto.debtId,
      organizationId: dto.organizationId,
    });

    // Validate date ranges
    const acquiredDate = new Date(dto.acquiredDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time for date-only comparison

    if (acquiredDate > today) {
      throw new InvalidHistoryDateRangeException(
        'Acquired date cannot be in the future.',
      );
    }

    if (dto.soldDate) {
      const soldDate = new Date(dto.soldDate);
      if (soldDate < acquiredDate) {
        throw new InvalidHistoryDateRangeException(
          'Sold date cannot be before acquired date.',
        );
      }
    }

    const record = this.historyRepository.create({
      debtId: dto.debtId,
      organizationId: dto.organizationId,
      acquiredDate: new Date(dto.acquiredDate),
      soldDate: dto.soldDate ? new Date(dto.soldDate) : null,
      source: dto.source,
    });

    const savedRecord = await this.historyRepository.save(record);

    this.logger.log('Ownership history record created successfully', {
      recordId: savedRecord.id,
      debtId: dto.debtId,
      organizationId: dto.organizationId,
    });

    return OwnershipHistoryResponseDto.fromEntity(savedRecord);
  }

  /**
   * Bulk create ownership history records.
   * 
   * **Internal Use**: Optimization for portfolio transfers affecting many debts.
   * Creates multiple records in a single transaction.
   * 
   * @param dtos - Array of ownership history data
   * @returns Array of created history records
   * @throws InvalidHistoryDateRangeException if any dates are invalid
   */
  async bulkCreateHistoryRecords(
    dtos: CreateOwnershipHistoryDto[],
  ): Promise<OwnershipHistoryResponseDto[]> {
    this.logger.log(`Bulk creating ${dtos.length} ownership history records`);

    // Validate all DTOs first
    for (const dto of dtos) {
      const acquiredDate = new Date(dto.acquiredDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (acquiredDate > today) {
        throw new InvalidHistoryDateRangeException(
          `Acquired date cannot be in the future for debt ${dto.debtId}.`,
        );
      }

      if (dto.soldDate) {
        const soldDate = new Date(dto.soldDate);
        if (soldDate < acquiredDate) {
          throw new InvalidHistoryDateRangeException(
            `Sold date cannot be before acquired date for debt ${dto.debtId}.`,
          );
        }
      }
    }

    // Create records in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const records = dtos.map((dto) =>
        this.historyRepository.create({
          debtId: dto.debtId,
          organizationId: dto.organizationId,
          acquiredDate: new Date(dto.acquiredDate),
          soldDate: dto.soldDate ? new Date(dto.soldDate) : null,
          source: dto.source,
        }),
      );

      const savedRecords = await queryRunner.manager.save(
        DebtOwnershipHistory,
        records,
      );

      await queryRunner.commitTransaction();

      this.logger.log(`Successfully created ${savedRecords.length} ownership history records`);

      return savedRecords.map((record) =>
        OwnershipHistoryResponseDto.fromEntity(record),
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to bulk create ownership history records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        count: dtos.length,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Close ownership records for debts (set soldDate).
   * 
   * **Internal Use**: Called during portfolio transfers to close current ownership.
   * Sets soldDate on all records where debtId is in the array AND soldDate is null.
   * 
   * Process:
   * 1. Find all current ownership records (soldDate = null) for the debts
   * 2. Set soldDate on all found records
   * 3. Log for audit trail
   * 
   * @param debtIds - Array of debt IDs to close ownership for
   * @param soldDate - Date the ownership ended
   * @returns Number of records updated
   * @throws InvalidHistoryDateRangeException if soldDate is invalid
   */
  async closeOwnershipRecords(
    debtIds: string[],
    soldDate: string,
  ): Promise<number> {
    this.logger.log(`Closing ownership records for ${debtIds.length} debts`, {
      soldDate,
    });

    // Validate soldDate is not in future
    const soldDateObj = new Date(soldDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (soldDateObj > today) {
      throw new InvalidHistoryDateRangeException(
        'Sold date cannot be in the future.',
      );
    }

    // Find all current ownership records
    const currentRecords = await this.historyRepository.find({
      where: {
        debtId: In(debtIds),
        soldDate: IsNull(),
      },
    });

    if (currentRecords.length === 0) {
      this.logger.warn('No current ownership records found to close', {
        debtIdsCount: debtIds.length,
      });
      return 0;
    }

    // Validate soldDate is after acquiredDate for all records
    for (const record of currentRecords) {
      if (soldDateObj < record.acquiredDate) {
        throw new InvalidHistoryDateRangeException(
          `Sold date ${soldDate} cannot be before acquired date ${record.acquiredDate.toISOString().split('T')[0]} for debt ${record.debtId}.`,
        );
      }
    }

    // Update all records in transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Update soldDate for all current ownership records
      const updateResult = await queryRunner.manager.update(
        DebtOwnershipHistory,
        {
          debtId: In(debtIds),
          soldDate: IsNull(),
        },
        {
          soldDate: soldDateObj,
        },
      );

      await queryRunner.commitTransaction();

      const updatedCount = updateResult.affected ?? 0;

      this.logger.log(`Successfully closed ${updatedCount} ownership records`, {
        debtIdsCount: debtIds.length,
        soldDate,
      });

      return updatedCount;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to close ownership records', {
        error: error instanceof Error ? error.message : 'Unknown error',
        debtIdsCount: debtIds.length,
        soldDate,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Verify ownership history integrity for a debt.
   * 
   * **Internal Use**: Can be called by other modules to verify data integrity.
   * 
   * Checks:
   * - Only one record with soldDate = null (current owner)
   * - No chronological gaps or overlaps
   * - All date ranges are valid
   * 
   * @param debtId - Debt ID to check
   * @returns Object with integrity status and any issues found
   */
  async verifyOwnershipIntegrity(debtId: string): Promise<{
    isValid: boolean;
    issues: string[];
  }> {
    const records = await this.historyRepository.find({
      where: { debtId },
      order: { acquiredDate: 'ASC' },
    });

    const issues: string[] = [];

    if (records.length === 0) {
      issues.push('No ownership history records found');
      return { isValid: false, issues };
    }

    // Check for multiple current owners
    const currentOwners = records.filter((r) => r.soldDate === null);
    if (currentOwners.length > 1) {
      issues.push(`Multiple current owners found (${currentOwners.length})`);
    } else if (currentOwners.length === 0) {
      issues.push('No current owner found (all records have soldDate set)');
    }

    // Check date validity and chronological order
    for (let i = 0; i < records.length; i++) {
      const record = records[i];

      // Check soldDate >= acquiredDate
      if (record.soldDate && record.soldDate < record.acquiredDate) {
        issues.push(
          `Record ${record.id}: soldDate before acquiredDate`,
        );
      }

      // Check chronological order between consecutive records
      if (i > 0) {
        const previousRecord = records[i - 1];
        if (
          previousRecord.soldDate &&
          record.acquiredDate < previousRecord.soldDate
        ) {
          issues.push(
            `Gap or overlap between records ${previousRecord.id} and ${record.id}`,
          );
        }
      }
    }

    const isValid = issues.length === 0;
    return { isValid, issues };
  }
}
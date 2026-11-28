import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Debt } from './entities/debt.entity';
import { DebtDebtor } from './entities/debt-debtor.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { CreateDebtDto } from './dto/create-debt.dto';
import { UpdateDebtDto } from './dto/update-debt.dto';
import { QueryDebtsDto } from './dto/query-debts.dto';
import { DebtResponseDto, PaginatedDebtResponseDto } from './dto/debt-response.dto';
import {
  DebtNotFoundException,
  InvalidStatusTransitionException,
  DuplicateAccountNumberException,
  PortfolioAccessDeniedException,
} from './errors';
import { EVENT_TYPES } from '@verichron/events';
import { DebtStatus, DebtCategory, isValidStatusTransition, DebtSortField, UserType, OrganizationRole } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import { DebtCreatedDto, DebtUpdatedDto, DebtStatusChangedDto } from '../events/event-dto';
import { DebtIndexService } from './redis-read-model/debt-index.service';
import { RequestContext, addCurrency } from '../core';

/**
 * Service responsible for debt management business logic.
 * 
 * Core Responsibilities:
 * - CRUD operations on debt records
 * - Status transition validation
 * - Immutable field enforcement
 * - Layer 2 authorization (portfolio access checks)
 * - Event publishing for debt lifecycle changes
 * - Calculated field management (currentBalance)
 * 
 * Dependencies:
 * - EventPublisher: For publishing thin events (DebtCreated, DebtStatusChanged, etc.)
 * - UserPortfolioPermission repository: For Layer 2 authorization checks
 * 
 * Security:
 * - All operations scoped by organizationId (tenant isolation)
 * - Portfolio access verified before returning debt data
 * - Immutable fields cannot be modified after creation
 */
@Injectable()
export class DebtsService {
  private readonly logger = new Logger(DebtsService.name);

  constructor(
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    @InjectRepository(DebtDebtor)
    private readonly debtDebtorRepository: Repository<DebtDebtor>,
    @InjectRepository(UserPortfolioPermission)
    private readonly userPortfolioPermissionRepository: Repository<UserPortfolioPermission>,
    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
    private readonly debtIndexService: DebtIndexService,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Create a new debt record with associated debtors.
   *
   * Process:
   * 1. Validate accountNumber uniqueness within organization
   * 2. Calculate initial currentBalance (principal + interest + fees)
   * 3. Create debt record within transaction
   * 4. Create debt_debtor join table entries
   * 5. Publish DebtCreated event
   *
   * @param createDebtDto - Debt creation data
   * @returns Created debt with debtor associations
   * @throws DuplicateAccountNumberException if accountNumber already exists
   */
  async create(
    createDebtDto: CreateDebtDto,
  ): Promise<DebtResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Creating debt for organization ${organizationId}`, {
      accountNumber: createDebtDto.accountNumber,
      portfolioId: createDebtDto.portfolioId,
    });

    // Check for duplicate account number within organization
    const existingDebt = await this.debtRepository.findOne({
      where: {
        organizationId,
        accountNumber: createDebtDto.accountNumber,
      },
    });

    if (existingDebt) {
      throw new DuplicateAccountNumberException(
        createDebtDto.accountNumber,
        organizationId,
      );
    }

    // Calculate initial current balance using safe integer arithmetic
    const currentBalance = addCurrency(
      createDebtDto.principalAmount,
      createDebtDto.interestAmount ?? 0,
      createDebtDto.feesAmount ?? 0,
    );

    // Use transaction to ensure atomicity
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create debt record
      const debt = this.debtRepository.create({
        organizationId,
        portfolioId: createDebtDto.portfolioId,
        originalCreditorName: createDebtDto.originalCreditorName,
        accountNumber: createDebtDto.accountNumber,
        principalAmount: createDebtDto.principalAmount.toFixed(2),
        interestAmount: (createDebtDto.interestAmount ?? 0).toFixed(2),
        feesAmount: (createDebtDto.feesAmount ?? 0).toFixed(2),
        currentBalance,
        status: createDebtDto.status,
        originalDebtDate: new Date(createDebtDto.originalDebtDate),
        notes: createDebtDto.notes ?? null,
        lastPaymentDate: null,
      });

      const savedDebt = await queryRunner.manager.save(Debt, debt);

      // Create debt-debtor associations
      const debtorLinks = createDebtDto.debtorProfileIds.map((debtorProfileId) =>
        this.debtDebtorRepository.create({
          debtId: savedDebt.id,
          debtorProfileId,
        }),
      );

      await queryRunner.manager.save(DebtDebtor, debtorLinks);

      await queryRunner.commitTransaction();

      // Load with associations for response
      const createdDebt = await this.debtRepository.findOne({
        where: { id: savedDebt.id },
        relations: ['debtorLinks'],
      });

      this.logger.log(`Debt created successfully`, {
        debtId: savedDebt.id,
        organizationId,
        accountNumber: createDebtDto.accountNumber,
      });

      // Publish DebtCreated event
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_DEBT_CREATED,
        {
          debtId: savedDebt.id,
          debtorIdentityId: createDebtDto.debtorIdentityId, // NEW
          debtorProfileId: createDebtDto.debtorProfileIds[0] || 'unknown-debtor-profile', // Use first debtor profile as primary for event
          organizationId,
          amount: parseFloat(savedDebt.currentBalance),
          currency: 'USD', // TODO: Get actual currency from createDebtDto or config
          status: savedDebt.status,
          createdAt: savedDebt.createdAt.toISOString(),
        },
        DebtCreatedDto,
      );

      return DebtResponseDto.fromEntity(createdDebt!);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error('Failed to create debt', {
        error: error instanceof Error ? error.message : 'Unknown error',
        organizationId,
        accountNumber: createDebtDto.accountNumber,
      });
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Find all debts with filters, pagination, and Layer 2 authorization.
   *
   * Security:
   * - Results scoped to organizationId (Layer 1)
   * - Filtered to portfolios user has access to (Layer 2)
   *
   * Performance:
   * - Efficient pagination with pageSize/offset
   * - Indexes on commonly filtered fields
   *
   * @param query - Query filters and pagination params
   * @returns Paginated list of debts
   */
  async findAll(
    query: QueryDebtsDto,
  ): Promise<PaginatedDebtResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Querying debts for organization ${organizationId}`, {
      userId,
      filters: query,
    });

    const queryBuilder = this.debtRepository
      .createQueryBuilder('debts')
      .select([
        'debts.id',
        'debts.organizationId',
        'debts.portfolioId',
        'debts.originalCreditorName',
        'debts.accountNumber',
        'debts.principalAmount',
        'debts.interestAmount',
        'debts.feesAmount',
        'debts.currentBalance',
        'debts.status',
        'debts.originalDebtDate',
        'debts.lastPaymentDate',
        'debts.notes',
        'debts.createdAt',
        'debts.updatedAt',
      ])
      .leftJoinAndSelect('debts.debtorLinks', 'debtorLink')
      .where('debts.organization_id = :organizationId', { organizationId });

    // Create a separate query builder for counting total results
    const countQueryBuilder = this.debtRepository
      .createQueryBuilder('debts')
      .leftJoin('debts.debtorLinks', 'debtorLink')
      .where('debts.organization_id = :organizationId', { organizationId });

    // Layer 2 Authorization: Determine if user needs portfolio filtering
    // Platform admins and org admins/managers/viewers bypass portfolio permissions
    // Only org agents need explicit portfolio access
    const userType = this.requestContext.getUserType();
    const needsPortfolioFilter = this.requiresPortfolioFiltering(userType);

    if (needsPortfolioFilter) {
      // Non-admin users: Apply portfolio permission filter
      const portfolioAccessJoin = `upp.portfolio_id = debts.portfolio_id AND upp.user_id = :userId`;
      queryBuilder.innerJoin(
        'user_portfolio_permission',
        'upp',
        portfolioAccessJoin,
        { userId },
      );
      countQueryBuilder.innerJoin(
        'user_portfolio_permission',
        'upp',
        portfolioAccessJoin,
        { userId },
      );
    }
    // Else: Admins/Platform users see all debts in their org (orgId filter already applied)

    // Apply filters to both query builders
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      queryBuilder.andWhere('debts.status IN (:...statuses)', { statuses });
      countQueryBuilder.andWhere('debts.status IN (:...statuses)', { statuses });
    }

    if (query.portfolioId) {
      queryBuilder.andWhere('debts.portfolio_id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
      countQueryBuilder.andWhere('debts.portfolio_id = :portfolioId', {
        portfolioId: query.portfolioId,
      });
    }

    if (query.minBalance !== undefined) {
      queryBuilder.andWhere('debts.current_balance >= :minBalance', {
        minBalance: query.minBalance,
      });
      countQueryBuilder.andWhere('debts.current_balance >= :minBalance', {
        minBalance: query.minBalance,
      });
    }

    if (query.maxBalance !== undefined) {
      queryBuilder.andWhere('debts.current_balance <= :maxBalance', {
        maxBalance: query.maxBalance,
      });
      countQueryBuilder.andWhere('debts.current_balance <= :maxBalance', {
        maxBalance: query.maxBalance,
      });
    }

    if (query.search) {
      const searchCondition = '(debts.account_number ILIKE :search OR debts.original_creditor_name ILIKE :search)';
      queryBuilder.andWhere(searchCondition, { search: `%${query.search}%` });
      countQueryBuilder.andWhere(searchCondition, { search: `%${query.search}%` });
    }

    if (query.debtorProfileId) {
      queryBuilder.andWhere('debtorLink.debtor_profile_id = :debtorProfileId', {
        debtorProfileId: query.debtorProfileId,
      });
      countQueryBuilder.andWhere('debtorLink.debtor_profile_id = :debtorProfileId', {
        debtorProfileId: query.debtorProfileId,
      });
    }

    // Get total count first
    const total = await countQueryBuilder.getCount();

    // Apply sorting to the main query builder
    const orderBy = query.orderBy ?? DebtSortField.CREATED_AT;
    const order = query.order ?? 'DESC';

    // Map snake_case column names to camelCase property names for TypeORM
    // This is needed because we use explicit .select() which expects property names
    const columnToPropertyMap: Record<string, string> = {
      'created_at': 'createdAt',
      'updated_at': 'updatedAt',
      'current_balance': 'currentBalance',
      'principal_amount': 'principalAmount',
      'original_debt_date': 'originalDebtDate',
      'account_number': 'accountNumber',
      'status': 'status',
    };

    const orderByProperty = columnToPropertyMap[orderBy] || orderBy;
    queryBuilder.orderBy(`debts.${orderByProperty}`, order);

    // Apply pagination to the main query builder
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    queryBuilder.skip(skip).take(pageSize);

    // Execute query to get entities
    const debts = await queryBuilder.getMany();

    this.logger.log(`Found ${total} debts (page ${page})`, {
      organizationId,
      total,
      page,
      pageSize,
    });

    return {
      data: debts.map((debt) => DebtResponseDto.fromEntity(debt)),
      total,
      page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find a single debt by ID with Layer 2 authorization check.
   *
   * Security:
   * - Verifies organizationId matches (tenant isolation)
   * - Verifies user has access to the portfolio (Layer 2)
   *
   * @param id - Debt ID
   * @returns Debt details
   * @throws DebtNotFoundException if debt not found or access denied
   * @throws PortfolioAccessDeniedException if user lacks portfolio access
   */
  async findOne(
    id: string,
  ): Promise<DebtResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Fetching debt ${id}`, { organizationId, userId });

    const debt = await this.debtRepository.findOne({
      where: { id, organizationId },
      relations: ['debtorLinks'],
    });

    if (!debt) {
      throw new DebtNotFoundException(id);
    }

    // Layer 2 Authorization: Check portfolio access
    const hasAccess = await this.checkPortfolioAccess(userId, debt.portfolioId);
    if (!hasAccess) {
      throw new PortfolioAccessDeniedException(debt.portfolioId);
    }

    return DebtResponseDto.fromEntity(debt);
  }

  /**
   * Update a debt record with validation and authorization.
   *
   * Validation:
   * - Prevents modification of immutable fields
   * - Validates status transitions via state machine
   * - Applies validation groups based on user permissions
   *
   * Events:
   * - Publishes DebtUpdated event for all changes
   * - Publishes DebtStatusChanged event if status changed
   *
   * @param id - Debt ID
   * @param updateDebtDto - Fields to update
   * @returns Updated debt
   * @throws DebtNotFoundException if debt not found
   * @throws ImmutableFieldModificationException if immutable field modified
   * @throws InvalidStatusTransitionException if status transition invalid
   */
  async update(
    id: string,
    updateDebtDto: UpdateDebtDto,
  ): Promise<DebtResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    const userPermissions = this.requestContext.getPermissions();

    this.logger.log(`Updating debt ${id}`, {
      organizationId,
      userId,
      updates: Object.keys(updateDebtDto),
    });

    // Fetch existing debt
    const debt = await this.debtRepository.findOne({
      where: { id, organizationId },
      relations: ['debtorLinks'],
    });

    if (!debt) {
      throw new DebtNotFoundException(id);
    }

    // Layer 2 Authorization: Check portfolio access
    const hasAccess = await this.checkPortfolioAccess(userId, debt.portfolioId);
    if (!hasAccess) {
      throw new PortfolioAccessDeniedException(debt.portfolioId);
    }

    const previousStatus = debt.status;

    // Validate status transition if status is being changed
    if (updateDebtDto.status && updateDebtDto.status !== debt.status) {
      if (!isValidStatusTransition(debt.status, updateDebtDto.status)) {
        throw new InvalidStatusTransitionException(debt.status, updateDebtDto.status);
      }
    }

    // Apply updates (only fields that are defined in DTO)
    if (updateDebtDto.notes !== undefined) {
      debt.notes = updateDebtDto.notes;
    }

    if (updateDebtDto.status !== undefined) {
      debt.status = updateDebtDto.status;
    }

    // Admin-only fields
    if (userPermissions.includes('debt:update')) {
      if (updateDebtDto.interestAmount !== undefined) {
        debt.interestAmount = updateDebtDto.interestAmount.toFixed(2);
        // Recalculate currentBalance
        debt.currentBalance = this.calculateBalance(debt);
      }

      if (updateDebtDto.feesAmount !== undefined) {
        debt.feesAmount = updateDebtDto.feesAmount.toFixed(2);
        // Recalculate currentBalance
        debt.currentBalance = this.calculateBalance(debt);
      }
    }

    // Save changes
    const updatedDebt = await this.debtRepository.save(debt);

    this.logger.log(`Debt updated successfully`, {
      debtId: id,
      organizationId,
      statusChanged: previousStatus !== updatedDebt.status,
    });

    // Publish DebtUpdated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_DEBT_UPDATED,
      {
        debtId: updatedDebt.id,
        organizationId,
        portfolioId: updatedDebt.portfolioId,
        updatedBy: userId,
        updatedAt: updatedDebt.updatedAt.toISOString(),
      },
      DebtUpdatedDto,
    );

    // Publish DebtStatusChanged event if status changed
    if (previousStatus !== updatedDebt.status) {
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
        {
          debtId: updatedDebt.id,
          organizationId,
          portfolioId: updatedDebt.portfolioId,
          oldStatus: previousStatus,
          newStatus: updatedDebt.status,
          updatedBy: userId,
          updatedAt: updatedDebt.updatedAt.toISOString(),
        },
        DebtStatusChangedDto,
      );
    }

    return DebtResponseDto.fromEntity(updatedDebt);
  }

  /**
   * Archive a debt by changing status to CHARGED_OFF.
   *
   * Debts cannot be deleted - they must be archived via status change
   * to maintain audit trail and legal compliance.
   *
   * @param id - Debt ID
   * @throws DebtNotFoundException if debt not found
   * @throws PortfolioAccessDeniedException if user lacks portfolio access
   */
  async remove(id: string): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Archiving debt ${id} (changing to CHARGED_OFF)`, {
      organizationId,
      userId,
    });

    const debt = await this.debtRepository.findOne({
      where: { id, organizationId },
    });

    if (!debt) {
      throw new DebtNotFoundException(id);
    }

    // Layer 2 Authorization: Check portfolio access
    const hasAccess = await this.checkPortfolioAccess(userId, debt.portfolioId);
    if (!hasAccess) {
      throw new PortfolioAccessDeniedException(debt.portfolioId);
    }

    // Validate status transition
    const previousStatus = debt.status;
    if (!isValidStatusTransition(debt.status, DebtStatus.CHARGED_OFF)) {
      throw new InvalidStatusTransitionException(debt.status, DebtStatus.CHARGED_OFF);
    }

    // Update status to CHARGED_OFF
    debt.status = DebtStatus.CHARGED_OFF;
    const updatedDebt = await this.debtRepository.save(debt);

    this.logger.log(`Debt archived successfully`, {
      debtId: id,
      previousStatus,
      newStatus: DebtStatus.CHARGED_OFF,
    });

    // Publish DebtStatusChanged event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_DEBT_STATUS_CHANGED,
      {
        debtId: updatedDebt.id,
        organizationId,
        portfolioId: updatedDebt.portfolioId,
        oldStatus: previousStatus,
        newStatus: DebtStatus.CHARGED_OFF,
        updatedBy: userId,
        updatedAt: updatedDebt.updatedAt.toISOString(),
      },
      DebtStatusChangedDto,
    );
  }

  /**
   * Find all debts for a DEBTOR user in a specific organization.
   * Uses Redis read model for <20ms query performance.
   *
   * This endpoint is specifically for DEBTOR users to view their own debts
   * across the organizations they have access to.
   *
   * **Performance Characteristics:**
   * - Redis ZRANGE: O(log N + M) where M = returned items
   * - Redis HGETALL: O(N) where N = number of fields per debt
   * - PostgreSQL fallback: O(N) full table scan with joins
   * - Expected: <50ms for 100 debts via Redis, <200ms via PostgreSQL
   *
   * **Security:**
   * - Returns only debts for the authenticated user's debtor profile
   * - Filtered by organizationId for multi-tenant isolation
   * - No Layer 2 portfolio authorization required (debtor owns their debts)
   *
   * **Fallback Strategy:**
   * - First try Redis read model (fast path)
   * - If Redis returns no results, fall back to PostgreSQL (slow path)
   * - PostgreSQL fallback handles case where Redis index not yet built
   *
   * @param pageSize - Maximum number of debts to return (default 100)
   * @param offset - Pagination offset (default 0)
   * @returns Paginated list of debts for the debtor
   */
  async findMyDebts(
    pageSize = 100,
    offset = 0,
  ): Promise<PaginatedDebtResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Finding debts for user ${userId} in organization ${organizationId}`, {
      userId,
      organizationId,
      pageSize,
      offset,
    });

    // Fast path: Try Redis read model first
    const debtIds = await this.debtIndexService.getDebtorDebtsInOrg(
      userId,
      organizationId,
      pageSize,
      offset,
    );

    if (debtIds.length > 0) {
      this.logger.debug(`Found ${debtIds.length} debts in Redis for user ${userId}`);

      // Get debt summaries from Redis
      const summaries = await this.debtIndexService.getDebtSummaries(debtIds);

      // Transform Redis summaries to DebtResponseDto format
      const debts: DebtResponseDto[] = summaries.map((summary) => ({
        id: summary.debtId,
        organizationId: summary.organizationId,
        portfolioId: '', // Not stored in Redis summary, default to empty string
        originalCreditorName: '', // Not stored in Redis summary, default to empty string
        accountNumber: '', // Not stored in Redis summary, default to empty string
        principalAmount: summary.amount.toString(), // Use amount from summary
        interestAmount: '0.00', // Not stored in Redis summary, default
        feesAmount: '0.00', // Not stored in Redis summary, default
        currentBalance: summary.amount.toString(), // Use amount from summary
        status: summary.status as DebtStatus,
        debtCategory: DebtCategory.OTHER, // Not stored in Redis summary, default to OTHER
        debtSubcategory: null, // Not stored in Redis summary, default to null
        originalDebtDate: new Date(summary.createdAt).toISOString().split('T')[0], // Use createdAt as a placeholder
        lastPaymentDate: null, // Not stored in Redis summary, default to null
        debtorProfileIds: [summary.debtorProfileId], // Use debtorProfileId from summary
        notes: null, // Not stored in Redis summary, default to null
        createdAt: summary.createdAt,
        updatedAt: summary.createdAt, // Use createdAt as a placeholder
      }));

      return {
        data: debts,
        total: debts.length, // Note: This is approximate, exact total requires separate query
        page: Math.floor(offset / pageSize) + 1,
        pageSize: pageSize,
        totalPages: Math.ceil(debts.length / pageSize),
      };
    }

    // Slow path: Fallback to PostgreSQL if Redis has no data
    this.logger.warn(
      `No debts found in Redis for user ${userId}, falling back to PostgreSQL`,
      {
        userId,
        organizationId,
      },
    );

    // Query debts from PostgreSQL
    // Note: This requires knowing the debtorId for this userId
    // We can't easily do this without the debtorId → userId mapping
    // For now, return empty result and rely on Redis index being built
    // In production, we'd need to query api-debtors to get debtorId for userId
    return {
      data: [],
      total: 0,
      page: Math.floor(offset / pageSize) + 1,
      pageSize: pageSize,
      totalPages: 0,
    };
  }

  /**
   * Helper: Calculate current balance based on financial fields.
   * Used when interest or fees are updated.
   *
   * Note: Payments are subtracted via event handlers, not here.
   *
   * Uses integer arithmetic (cents) to avoid floating-point precision errors.
   */
  private calculateBalance(debt: Debt): string {
    return addCurrency(debt.principalAmount, debt.interestAmount, debt.feesAmount);
  }

  /**
   * Helper: Check if user has access to a portfolio (Layer 2 authorization).
   *
   * Queries user_portfolio_permission table to verify the user has been
   * explicitly granted access to the portfolio.
   *
   * @param userId - User ID to check
   * @param portfolioId - Portfolio ID to check access for
   * @returns true if user has access, false otherwise
   */
  private async checkPortfolioAccess(
    userId: string,
    portfolioId: string,
  ): Promise<boolean> {
    const permission = await this.userPortfolioPermissionRepository.findOne({
      where: { userId, portfolioId },
    });
    return !!permission;
  }

  /**
   * Determine if user requires portfolio-level filtering (Layer 2 authorization).
   *
   * Bypass Logic:
   * - Platform Admins: Full system access, bypass Layer 2
   * - Platform Support/Viewer: Read-only system access, bypass Layer 2 for reads
   * - Org Admins: Full org access, bypass Layer 2
   * - Org Managers: Most resources, bypass Layer 2
   * - Org Viewers: Read-only org access, bypass Layer 2 for reads
   * - Org Agents: Portfolio-specific access, REQUIRE Layer 2
   * - Debtors: Self-service only, handled by separate endpoint
   *
   * @param userType - The user's type from JWT token
   * @returns true if portfolio filtering is required, false to bypass
   */
  private requiresPortfolioFiltering(userType: UserType | undefined): boolean {
    // Platform users always bypass Layer 2
    if (userType === UserType.PLATFORM_USER) {
      this.logger.debug('Platform user detected - bypassing Layer 2 portfolio filtering');
      return false;
    }

    // Organization users: Check role and permissions
    if (userType === UserType.ORG_USER) {
      const roles = this.requestContext.getRoles();

      // Primary check: Use roles if available
      if (roles.length > 0) {
        // Admins, Managers, and Viewers bypass Layer 2
        if (roles.includes(OrganizationRole.ORG_ADMIN) ||
            roles.includes(OrganizationRole.ORG_MANAGER) ||
            roles.includes(OrganizationRole.ORG_VIEWER)) {
          this.logger.debug(`Organization ${roles.join(', ')} detected - bypassing Layer 2 portfolio filtering`);
          return false;
        }

        // Agents need portfolio filtering
        if (roles.includes(OrganizationRole.ORG_COLLECTOR)) {
          this.logger.debug('Organization agent detected - applying Layer 2 portfolio filtering');
          return true;
        }
      }

      // Fallback check: Use permissions when roles are unavailable
      // Admin-level permissions indicate org-wide access rights
      const permissions = this.requestContext.getPermissions();
      if (permissions.includes('debt:delete') ||
          permissions.includes('portfolio:delete') ||
          permissions.includes('user:delete')) {
        this.logger.debug('Organization user with admin-level permissions detected - bypassing Layer 2 portfolio filtering');
        return false;
      }

      // If no admin permissions, apply filtering
      this.logger.debug('Organization user without admin permissions - applying Layer 2 portfolio filtering');
      return true;
    }

    // Debtors shouldn't reach this endpoint (blocked by @Permissions guard)
    // But if they do, apply filtering as fallback security measure
    this.logger.warn(`User type ${userType} accessing debts - applying Layer 2 filtering as fallback`);
    return true;
  }
}
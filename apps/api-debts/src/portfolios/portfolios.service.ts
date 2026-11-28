import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Portfolio } from './entities/portfolio.entity';
import { UserPortfolioPermission } from './entities/user-portfolio-permission.entity';
import { Debt } from '../debts/entities/debt.entity';
import { CreatePortfolioDto } from './dto/create-portfolio.dto';
import { UpdatePortfolioDto } from './dto/update-portfolio.dto';
import { QueryPortfoliosDto } from './dto/query-portfolios.dto';
import {
  PortfolioResponseDto,
  PaginatedPortfolioResponseDto,
  PortfolioUserAccessDto,
} from './dto/portfolio-response.dto';
import { AssignUserDto, TransferPortfolioDto } from './dto/assign-user.dto';
import {
  PortfolioNotFoundException,
  InvalidPortfolioStatusTransitionException,
  UserAlreadyAssignedException,
  UserNotAssignedException,
  PortfolioTransferForbiddenException,
} from './errors';
import { EVENT_TYPES } from '@verichron/events';
import { PortfolioStatus } from '@verichron/enums';
import { EventPublisher } from '@verichron/event-publisher';
import {
  PortfolioCreatedDto,
  PortfolioUpdatedDto,
  PortfolioStatusChangedDto,
  PortfolioSoldDto,
  PortfolioUserAccessGrantedDto,
  PortfolioUserAccessRevokedDto,
} from '../events/event-dto';
import { RequestContext } from '../core';

// Define valid portfolio status transitions
const VALID_PORTFOLIO_STATUS_TRANSITIONS: Record<
  PortfolioStatus,
  PortfolioStatus[]
> = {
  [PortfolioStatus.PROVISIONING]: [PortfolioStatus.ACTIVE],
  [PortfolioStatus.ACTIVE]: [PortfolioStatus.CLOSED, PortfolioStatus.SOLD],
  [PortfolioStatus.CLOSED]: [],
  [PortfolioStatus.SOLD]: [],
};

/**
 * Helper function to validate portfolio status transitions.
 */
function isValidPortfolioStatusTransition(
  oldStatus: PortfolioStatus,
  newStatus: PortfolioStatus,
): boolean {
  const validTransitions = VALID_PORTFOLIO_STATUS_TRANSITIONS[oldStatus];
  return validTransitions ? validTransitions.includes(newStatus) : false;
}

/**
 * Service responsible for portfolio management business logic.
 * 
 * Core Responsibilities:
 * - Portfolio CRUD operations
 * - Status transition validation
 * - User-portfolio access management (Layer 2 authorization setup)
 * - Portfolio transfer between organizations
 * - Portfolio-level metrics aggregation
 * - Event publishing for portfolio lifecycle changes
 * 
 * Dependencies:
 * - EventPublisher: For publishing events (PortfolioCreated, PortfolioSold, etc.)
 * - Debt entity: For aggregating debt counts and balances
 * 
 * Security:
 * - All operations scoped by organizationId (tenant isolation)
 * - Portfolio transfers validated to prevent invalid operations
 */
@Injectable()
export class PortfoliosService {
  private readonly logger = new Logger(PortfoliosService.name);

  constructor(
    @InjectRepository(Portfolio)
    private readonly portfolioRepository: Repository<Portfolio>,
    @InjectRepository(UserPortfolioPermission)
    private readonly permissionRepository: Repository<UserPortfolioPermission>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    private readonly dataSource: DataSource,
    private readonly eventPublisher: EventPublisher,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Create a new portfolio record.
   *
   * Typically called by the import module during bulk portfolio ingestion.
   *
   * @param createPortfolioDto - Portfolio creation data
   * @returns Created portfolio with metrics
   */
  async create(
    createPortfolioDto: CreatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Creating portfolio for organization ${organizationId}`, {
      name: createPortfolioDto.name,
    });

    const portfolio = this.portfolioRepository.create({
      organizationId,
      name: createPortfolioDto.name,
      purchaseDate: new Date(createPortfolioDto.purchaseDate),
      purchasePrice: createPortfolioDto.purchasePrice.toFixed(2),
      totalPrincipal: createPortfolioDto.totalPrincipal.toFixed(2),
      source: createPortfolioDto.source,
      status: createPortfolioDto.status ?? PortfolioStatus.PROVISIONING,
    });

    const savedPortfolio = await this.portfolioRepository.save(portfolio);

    this.logger.log(`Portfolio created successfully`, {
      portfolioId: savedPortfolio.id,
      organizationId,
      name: savedPortfolio.name,
    });

    // Publish PortfolioCreated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_CREATED,
      {
        portfolioId: savedPortfolio.id,
        organizationId: organizationId,
        name: savedPortfolio.name,
        status: savedPortfolio.status,
        purchaseDate: savedPortfolio.purchaseDate.toISOString(),
        purchasePrice: savedPortfolio.purchasePrice,
        totalPrincipal: savedPortfolio.totalPrincipal,
        source: savedPortfolio.source,
        createdBy: userId,
        createdAt: savedPortfolio.createdAt.toISOString(),
      },
      PortfolioCreatedDto,
    );
    
    return PortfolioResponseDto.fromEntity(savedPortfolio, 0, '0.00');
  }

  /**
   * Find all portfolios with filters, pagination, and metrics.
   *
   * Includes aggregated debt counts and current balance totals.
   * Optimized to fetch all data in a single query using LEFT JOIN aggregation.
   *
   * @param query - Query filters and pagination params
   * @returns Paginated list of portfolios with metrics
   */
  async findAll(
    organizationId: string,
    query: QueryPortfoliosDto,
  ): Promise<PaginatedPortfolioResponseDto> {
    this.logger.log(`Querying portfolios for organization ${organizationId}`, {
      filters: query,
    });

    // Build query with aggregated metrics (optimized - no N+1)
    const queryBuilder = this.portfolioRepository
      .createQueryBuilder('portfolio')
      .leftJoin('Debt', 'debts', 'debts.portfolio_id = portfolio.id')
      .select([
        'portfolio.id',
        'portfolio.organizationId',
        'portfolio.name',
        'portfolio.purchaseDate',
        'portfolio.purchasePrice',
        'portfolio.totalPrincipal',
        'portfolio.source',
        'portfolio.status',
        'portfolio.primaryDebtCategory',
        'portfolio.portfolioTags',
        'portfolio.businessDescription',
        'portfolio.createdAt',
        'portfolio.updatedAt',
      ])
              .addSelect('COUNT(debts.id)', 'debtCount')
              .addSelect('COALESCE(SUM(CAST(debts.current_balance AS DECIMAL)), 0)',
        'totalCurrentBalance',
      )
      .where('portfolio.organizationId = :organizationId', { organizationId })
      .groupBy('portfolio.id');

    // Apply filters
    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      queryBuilder.andWhere('portfolio.status IN (:...statuses)', { statuses });
    }

    if (query.minPurchasePrice !== undefined) {
      queryBuilder.andWhere('portfolio.purchasePrice >= :minPrice', {
        minPrice: query.minPurchasePrice,
      });
    }

    if (query.maxPurchasePrice !== undefined) {
      queryBuilder.andWhere('portfolio.purchasePrice <= :maxPrice', {
        maxPrice: query.maxPurchasePrice,
      });
    }

    if (query.search) {
      queryBuilder.andWhere(
        '(portfolio.name ILIKE :search OR portfolio.source ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    // Apply sorting
    const orderBy = query.orderBy ?? 'createdAt';
    const order = query.order ?? 'DESC';
    queryBuilder.orderBy(`portfolio.${orderBy}`, order);

    // Get total count before pagination
    // Note: We need to count distinct portfolios, not total rows after aggregation
    const countQuery = this.portfolioRepository
      .createQueryBuilder('portfolio')
      .where('portfolio.organizationId = :organizationId', { organizationId });

    if (query.status) {
      const statuses = Array.isArray(query.status) ? query.status : [query.status];
      countQuery.andWhere('portfolio.status IN (:...statuses)', { statuses });
    }

    if (query.minPurchasePrice !== undefined) {
      countQuery.andWhere('portfolio.purchasePrice >= :minPrice', {
        minPrice: query.minPurchasePrice,
      });
    }

    if (query.maxPurchasePrice !== undefined) {
      countQuery.andWhere('portfolio.purchasePrice <= :maxPrice', {
        maxPrice: query.maxPurchasePrice,
      });
    }

    if (query.search) {
      countQuery.andWhere(
        '(portfolio.name ILIKE :search OR portfolio.source ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const total = await countQuery.getCount();

    // Apply pagination
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const skip = (page - 1) * pageSize;

    queryBuilder.offset(skip).limit(pageSize);

    // Execute query and transform results
    const rawResults = await queryBuilder.getRawAndEntities();

    const portfoliosWithMetrics = rawResults.entities.map((portfolio, index) => {
      const raw = rawResults.raw[index];
      return PortfolioResponseDto.fromEntity(
        portfolio,
        parseInt(raw.debtCount, 10) || 0,
        parseFloat(raw.totalCurrentBalance || '0').toFixed(2),
      );
    });

    this.logger.log(`Found ${total} portfolios (page ${page})`, {
      organizationId,
      total,
      page,
      pageSize,
    });

    return {
      data: portfoliosWithMetrics,
      total,
      page,
      pageSize: pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Find a single portfolio by ID with metrics.
   *
   * @param id - Portfolio ID
   * @returns Portfolio details with metrics
   * @throws PortfolioNotFoundException if portfolio not found or access denied
   */
  async findOne(
    organizationId: string,
    id: string,
  ): Promise<PortfolioResponseDto> {
    this.logger.log(`Fetching portfolio ${id}`, { organizationId });

    const portfolio = await this.portfolioRepository.findOne({
      where: { id, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(id);
    }

    const metrics = await this.getPortfolioMetrics(id);

    return PortfolioResponseDto.fromEntity(
      portfolio,
      metrics.debtCount,
      metrics.totalCurrentBalance,
    );
  }

  /**
   * Update a portfolio record with validation.
   *
   * Validates status transitions via state machine.
   *
   * @param id - Portfolio ID
   * @param updatePortfolioDto - Fields to update
   * @returns Updated portfolio
   * @throws PortfolioNotFoundException if portfolio not found
   * @throws InvalidPortfolioStatusTransitionException if status transition invalid
   */
  async update(
    id: string,
    updatePortfolioDto: UpdatePortfolioDto,
  ): Promise<PortfolioResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Updating portfolio ${id}`, {
      organizationId,
      userId,
      updates: Object.keys(updatePortfolioDto),
    });

    const portfolio = await this.portfolioRepository.findOne({
      where: { id, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(id);
    }

    const previousStatus = portfolio.status;

    // Validate status transition if status is being changed
    if (updatePortfolioDto.status && updatePortfolioDto.status !== portfolio.status) {
      if (!isValidPortfolioStatusTransition(portfolio.status, updatePortfolioDto.status)) {
        throw new InvalidPortfolioStatusTransitionException(
          portfolio.status,
          updatePortfolioDto.status,
        );
      }
    }

    // Apply updates
    if (updatePortfolioDto.name !== undefined) {
      portfolio.name = updatePortfolioDto.name;
    }

    if (updatePortfolioDto.purchaseDate !== undefined) {
      portfolio.purchaseDate = new Date(updatePortfolioDto.purchaseDate);
    }

    if (updatePortfolioDto.purchasePrice !== undefined) {
      portfolio.purchasePrice = updatePortfolioDto.purchasePrice.toFixed(2);
    }

    if (updatePortfolioDto.totalPrincipal !== undefined) {
      portfolio.totalPrincipal = updatePortfolioDto.totalPrincipal.toFixed(2);
    }

    if (updatePortfolioDto.source !== undefined) {
      portfolio.source = updatePortfolioDto.source;
    }

    if (updatePortfolioDto.status !== undefined) {
      portfolio.status = updatePortfolioDto.status;
    }

    const updatedPortfolio = await this.portfolioRepository.save(portfolio);

    this.logger.log(`Portfolio updated successfully`, {
      portfolioId: id,
      organizationId,
      statusChanged: previousStatus !== updatedPortfolio.status,
    });

    // Publish PortfolioUpdated event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_UPDATED,
      {
        portfolioId: updatedPortfolio.id,
        organizationId,
        updatedBy: userId,
        updatedAt: updatedPortfolio.updatedAt.toISOString(),
      },
      PortfolioUpdatedDto,
    );

    // Publish PortfolioStatusChanged event if status changed
    if (previousStatus !== updatedPortfolio.status) {
      await this.eventPublisher.publish(
        EVENT_TYPES.DEBTS_PORTFOLIO_STATUS_CHANGED,
        {
          portfolioId: updatedPortfolio.id,
          organizationId,
          oldStatus: previousStatus,
          newStatus: updatedPortfolio.status,
          updatedBy: userId,
          updatedAt: updatedPortfolio.updatedAt.toISOString(),
        },
        PortfolioStatusChangedDto,
      );
    }

    const metrics = await this.getPortfolioMetrics(id);
    return PortfolioResponseDto.fromEntity(
      updatedPortfolio,
      metrics.debtCount,
      metrics.totalCurrentBalance,
    );
  }

  /**
   * Archive a portfolio by changing status to CLOSED.
   *
   * Portfolios cannot be deleted - they must be archived via status change
   * to maintain audit trail and legal compliance.
   *
   * @param id - Portfolio ID
   * @throws PortfolioNotFoundException if portfolio not found
   * @throws InvalidPortfolioStatusTransitionException if transition invalid
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

    this.logger.log(`Archiving portfolio ${id} (changing to CLOSED)`, {
      organizationId,
      userId,
    });

    const portfolio = await this.portfolioRepository.findOne({
      where: { id, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(id);
    }

    // Validate status transition
    const previousStatus = portfolio.status;
    if (!isValidPortfolioStatusTransition(previousStatus, PortfolioStatus.CLOSED)) {
      throw new InvalidPortfolioStatusTransitionException(previousStatus, PortfolioStatus.CLOSED);
    }

    // Update status to CLOSED
    portfolio.status = PortfolioStatus.CLOSED;
    const updatedPortfolio = await this.portfolioRepository.save(portfolio);

    this.logger.log(`Portfolio archived successfully`, {
      portfolioId: id,
      previousStatus,
      newStatus: PortfolioStatus.CLOSED,
    });

    // Publish PortfolioStatusChanged event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_STATUS_CHANGED,
      {
        portfolioId: updatedPortfolio.id,
        organizationId,
        oldStatus: previousStatus,
        newStatus: PortfolioStatus.CLOSED,
        updatedBy: userId,
        updatedAt: updatedPortfolio.updatedAt.toISOString(),
      },
      PortfolioStatusChangedDto,
    );
  }

  /**
   * Assign a user access to a portfolio (Layer 2 authorization).
   *
   * Creates a user_portfolio_permission record granting the user
   * access to work on all debts within this portfolio.
   *
   * @param portfolioId - Portfolio ID
   * @param assignUserDto - User assignment data
   * @throws PortfolioNotFoundException if portfolio not found
   * @throws UserAlreadyAssignedException if user already has access
   */
  async assignUser(
    portfolioId: string,
    assignUserDto: AssignUserDto,
  ): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Assigning user to portfolio`, {
      portfolioId,
      userId: assignUserDto.userId,
      organizationId,
    });

    // Verify portfolio exists and belongs to organization
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(portfolioId);
    }

    // Check if user is already assigned
    const existingPermission = await this.permissionRepository.findOne({
      where: {
        userId: assignUserDto.userId,
        portfolioId,
      },
    });

    if (existingPermission) {
      throw new UserAlreadyAssignedException(assignUserDto.userId, portfolioId);
    }

    // Create permission record
    const permission = this.permissionRepository.create({
      userId: assignUserDto.userId,
      portfolioId,
    });

    await this.permissionRepository.save(permission);

    this.logger.log(`User assigned to portfolio successfully`, {
      portfolioId,
      userId: assignUserDto.userId,
    });

    // Publish PortfolioUserAccessGranted event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_GRANTED,
      {
        portfolioId,
        organizationId,
        userId: assignUserDto.userId,
        grantedAt: permission.createdAt.toISOString(),
      },
      PortfolioUserAccessGrantedDto,
    );
  }

  /**
   * Revoke a user's access to a portfolio.
   *
   * Deletes the user_portfolio_permission record.
   *
   * @param portfolioId - Portfolio ID
   * @param userId - User ID to revoke
   * @throws PortfolioNotFoundException if portfolio not found
   * @throws UserNotAssignedException if user doesn't have access
   */
  async revokeUser(
    portfolioId: string,
    userId: string,
  ): Promise<void> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Revoking user access from portfolio`, {
      portfolioId,
      userId,
      organizationId,
    });

    // Verify portfolio exists and belongs to organization
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(portfolioId);
    }

    // Check if user has access
    const permission = await this.permissionRepository.findOne({
      where: {
        userId,
        portfolioId,
      },
    });

    if (!permission) {
      throw new UserNotAssignedException(userId, portfolioId);
    }

    // Delete permission record
    await this.permissionRepository.remove(permission);

    this.logger.log(`User access revoked from portfolio successfully`, {
      portfolioId,
      userId,
    });

    // Publish PortfolioUserAccessRevoked event
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_USER_ACCESS_REVOKED,
      {
        portfolioId,
        organizationId,
        userId,
        revokedAt: new Date().toISOString(),
      },
      PortfolioUserAccessRevokedDto,
    );
  }

  /**
   * List all users who have access to a portfolio.
   *
   * @param portfolioId - Portfolio ID
   * @returns Array of users with access
   * @throws PortfolioNotFoundException if portfolio not found
   */
  async listUsers(
    portfolioId: string,
  ): Promise<PortfolioUserAccessDto[]> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    this.logger.log(`Listing users for portfolio ${portfolioId}`, { organizationId });

    // Verify portfolio exists and belongs to organization
    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(portfolioId);
    }

    // Fetch all permissions for this portfolio
    const permissions = await this.permissionRepository.find({
      where: { portfolioId },
      order: { createdAt: 'ASC' },
    });

    return permissions.map((permission) => ({
      userId: permission.userId,
      grantedAt: permission.createdAt.toISOString(),
    }));
  }

  /**
   * Transfer a portfolio to another organization.
   *
   * This is a critical operation that represents the sale of a debt portfolio.
   *
   * Process:
   * 1. Validates transfer is allowed
   * 2. Updates portfolio organizationId and status to SOLD
   * 3. Publishes PortfolioSold event
   * 4. Event subscribers handle updating debts and creating history records
   *
   * @param portfolioId - Portfolio ID
   * @param transferDto - Transfer details
   * @throws PortfolioNotFoundException if portfolio not found
   * @throws PortfolioTransferForbiddenException if transfer not allowed
   */
  async transfer(
    portfolioId: string,
    transferDto: TransferPortfolioDto,
  ): Promise<PortfolioResponseDto> {
    const organizationId = this.requestContext.getOrgId();
    if (!organizationId) {
      throw new Error('Organization context is required');
    }

    const userId = this.requestContext.getUserId();
    if (!userId) {
      throw new Error('User context is required');
    }

    this.logger.log(`Transferring portfolio ${portfolioId}`, {
      fromOrganization: organizationId,
      toOrganization: transferDto.newOrganizationId,
    });

    const portfolio = await this.portfolioRepository.findOne({
      where: { id: portfolioId, organizationId },
    });

    if (!portfolio) {
      throw new PortfolioNotFoundException(portfolioId);
    }

    // Validate transfer is allowed
    if (portfolio.status === PortfolioStatus.PROVISIONING) {
      throw new PortfolioTransferForbiddenException(
        portfolioId,
        'Portfolio is still being provisioned and cannot be transferred yet.',
      );
    }

    if (portfolio.status === PortfolioStatus.SOLD) {
      throw new PortfolioTransferForbiddenException(
        portfolioId,
        'Portfolio has already been sold and cannot be transferred again.',
      );
    }

    if (transferDto.newOrganizationId === organizationId) {
      throw new PortfolioTransferForbiddenException(
        portfolioId,
        'Cannot transfer portfolio to the same organization.',
      );
    }

    const previousOrganizationId = portfolio.organizationId;

    // Update portfolio
    portfolio.organizationId = transferDto.newOrganizationId;
    portfolio.status = PortfolioStatus.SOLD;

    const updatedPortfolio = await this.portfolioRepository.save(portfolio);

    this.logger.log(`Portfolio transferred successfully`, {
      portfolioId,
      fromOrganization: previousOrganizationId,
      toOrganization: transferDto.newOrganizationId,
    });

    // Publish PortfolioSold event
    // This event should trigger:
    // - Debts module: Update organizationId on all debts in this portfolio
    // - History module: Create debt_ownership_history records for all debts
    await this.eventPublisher.publish(
      EVENT_TYPES.DEBTS_PORTFOLIO_SOLD,
      {
        portfolioId,
        previousOrganizationId,
        newOrganizationId: transferDto.newOrganizationId,
        transferDate: transferDto.transferDate ?? new Date().toISOString().split('T')[0],
        transferPrice: transferDto.transferPrice?.toFixed(2),
        notes: transferDto.notes,
        soldBy: userId,
        soldAt: updatedPortfolio.updatedAt.toISOString(),
      },
      PortfolioSoldDto,
    );

    const metrics = await this.getPortfolioMetrics(portfolioId);
    return PortfolioResponseDto.fromEntity(
      updatedPortfolio,
      metrics.debtCount,
      metrics.totalCurrentBalance,
    );
  }

  /**
   * Helper: Get portfolio metrics (debt count and total current balance).
   *
   * Uses a single aggregation query for optimal performance.
   */
  private async getPortfolioMetrics(
    portfolioId: string,
  ): Promise<{ debtCount: number; totalCurrentBalance: string }> {
    const result = await this.debtRepository
      .createQueryBuilder('debts')
      .select('COUNT(debts.id)', 'debtCount')
      .addSelect('COALESCE(SUM(CAST(debts.currentBalance AS DECIMAL)), 0)', 'totalCurrentBalance')
      .where('debts.portfolioId = :portfolioId', { portfolioId })
      .getRawOne();

    return {
      debtCount: parseInt(result.debtCount, 10) || 0,
      totalCurrentBalance: parseFloat(result.totalCurrentBalance || '0').toFixed(2),
    };
  }

  /**
   * Helper: Check if user has access to a portfolio (for debts service Layer 2 auth).
   * 
   * This method is exported and used by the debts service to validate
   * portfolio access when retrieving/updating debts.
   * 
   * @param userId - User ID to check
   * @param portfolioId - Portfolio ID to check access for
   * @returns true if user has access, false otherwise
   */
  async checkUserAccess(userId: string, portfolioId: string): Promise<boolean> {
    const permission = await this.permissionRepository.findOne({
      where: { userId, portfolioId },
    });

    return !!permission;
  }
}
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual, In } from 'typeorm';
import { PaymentPlan } from './entities/payment-plan.entity';
import { PaymentPlanDebt } from './entities/payment-plan-debt.entity';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { QueryPlansDto } from './dto/query-plans.dto';
import { PaymentPlanStatus, VALID_PLAN_STATUS_TRANSITIONS } from './enums/payment-plan-status.enum';
import { calculateNextPaymentDate } from './enums/payment-frequency.enum';
import {
  PlanNotFoundException,
  InvalidPlanStateException,
  DebtAlreadyInPlanException,
  InvalidStateTransitionException,
} from './errors/plans.exceptions';
import { TransactionsService } from '../transactions/transaction.service';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES, EVENT_SOURCES, EVENT_TOPICS } from '@verichron/events';
import { PaymentPlanStatusChangedDto } from '../events/event-dto/payment-plans/payment-plan-status-changed.dto';

/**
 * Plans Service
 * 
 * Core business logic for payment plan management.
 * Handles plan creation, approval workflows, scheduled payment generation, and status transitions.
 * 
 * Key responsibilities:
 * - Multi-debt consolidation
 * - Approval workflow orchestration
 * - Scheduled payment generation
 * - Failed payment handling
 * - Status transition validation
 */
@Injectable()
export class PlansService {
  private readonly logger = new Logger(PlansService.name);

  constructor(
    @InjectRepository(PaymentPlan)
    private readonly planRepository: Repository<PaymentPlan>,
    @InjectRepository(PaymentPlanDebt)
    private readonly planDebtRepository: Repository<PaymentPlanDebt>,
    private readonly transactionsService: TransactionsService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a new payment plan
   * 
   * Workflow:
   * 1. Validate all debts exist and are active (TODO: call api-debts)
   * 2. Check if any debt is already in an ACTIVE plan
   * 3. Calculate totalAmount from debt balances
   * 4. Calculate installmentAmount
   * 5. Fetch organization settings for approval threshold (TODO: call api-organizations)
   * 6. Set status (DRAFT, PENDING_APPROVAL, or ACTIVE)
   * 7. Create PaymentPlan and PaymentPlanDebt records
   * 8. Publish event if ACTIVE
   * 
   * @param createDto Plan details
   * @param userId User creating the plan
   * @param organizationId Organization context
   * @returns Created payment plan
   */
  async create(
    createDto: CreatePlanDto,
    userId: string,
    organizationId: string,
  ): Promise<PaymentPlan> {
    this.logger.log(
      `Creating payment plan for ${createDto.debtIds.length} debt(s) in organization ${organizationId}`,
    );

    // Validate start date is in the future
    const startDate = new Date(createDto.startDate);
    if (startDate <= new Date()) {
      throw new Error('Start date must be a future date');
    }

    // TODO: Validate all debts exist and are active
    // Call api-debts: GET /debts?ids=...&status=ACTIVE
    // For now, we'll proceed with validation

    // Check if any debt is already in an ACTIVE plan
    const existingPlanDebts = await this.planDebtRepository.find({
      where: { debtId: In(createDto.debtIds) },
      relations: ['paymentPlan'],
    });

    for (const planDebt of existingPlanDebts) {
      if (planDebt.paymentPlan.status === PaymentPlanStatus.ACTIVE) {
        throw new DebtAlreadyInPlanException(
          planDebt.debtId,
          planDebt.paymentPlan.id,
        );
      }
    }

    // TODO: Fetch debt balances from api-debts
    // For now, we'll use a placeholder calculation
    const totalAmount = 1500.00; // TODO: Calculate from debt balances
    const installmentAmount = totalAmount / createDto.numberOfInstallments;

    // TODO: Fetch organization settings for approval threshold
    // Call api-organizations: GET /organizations/{id}/settings
    const approvalThreshold = 1000.00; // TODO: Fetch from settings

    // Determine initial status
    let status = PaymentPlanStatus.DRAFT;
    if (totalAmount <= approvalThreshold) {
      status = PaymentPlanStatus.ACTIVE;
    } else {
      status = PaymentPlanStatus.PENDING_APPROVAL;
    }

    // TODO: Fetch debtorId from first debt via api-debts
    const debtorId = 'placeholder-debtor-id'; // TODO: Fetch from debt

    // Create payment plan
    const plan = this.planRepository.create({
      organizationId,
      debtorId,
      status,
      totalAmount,
      numberOfInstallments: createDto.numberOfInstallments,
      installmentAmount,
      frequency: createDto.frequency,
      startDate,
      nextPaymentDate: startDate,
      paymentMethodToken: createDto.paymentMethodToken,
      createdByUserId: userId,
      metadata: createDto.metadata || null,
    });

    const savedPlan = await this.planRepository.save(plan);

    // Create PaymentPlanDebt associations
    for (const debtId of createDto.debtIds) {
      const planDebt = this.planDebtRepository.create({
        paymentPlanId: savedPlan.id,
        debtId,
        debtBalanceAtCreation: 500.00, // TODO: Fetch actual balance from api-debts
      });
      await this.planDebtRepository.save(planDebt);
    }

    // If plan was auto-activated, publish event
    if (status === PaymentPlanStatus.ACTIVE) {
      await this.publishStatusChangedEvent(
        savedPlan,
        PaymentPlanStatus.DRAFT,
        PaymentPlanStatus.ACTIVE,
      );
    }

    this.logger.log(
      `Payment plan ${savedPlan.id} created with status ${status}`,
    );

    return savedPlan;
  }

  /**
   * Update an existing payment plan
   * 
   * Business Rule: Only DRAFT plans can be updated.
   * 
   * @param id Plan ID
   * @param updateDto Update details
   * @param userId User updating the plan
   * @param organizationId Organization context
   * @returns Updated payment plan
   */
  async update(
    id: string,
    updateDto: UpdatePlanDto,
    userId: string,
    organizationId: string,
  ): Promise<PaymentPlan> {
    this.logger.log(`Updating payment plan ${id}`);

    const plan = await this.findOne(id, organizationId);

    // Only DRAFT plans can be updated
    if (plan.status !== PaymentPlanStatus.DRAFT) {
      throw new InvalidPlanStateException(
        id,
        plan.status,
        PaymentPlanStatus.DRAFT,
      );
    }

    // If debtIds are being updated, handle debt associations
    if (updateDto.debtIds) {
      // Remove old associations
      await this.planDebtRepository.delete({ paymentPlanId: id });

      // TODO: Check for conflicts with active plans
      // Add new associations
      for (const debtId of updateDto.debtIds) {
        const planDebt = this.planDebtRepository.create({
          paymentPlanId: id,
          debtId,
          debtBalanceAtCreation: 500.00, // TODO: Fetch actual balance
        });
        await this.planDebtRepository.save(planDebt);
      }

      // Recalculate totalAmount and installmentAmount
      const totalAmount = 1500.00; // TODO: Calculate from new debt balances
      plan.totalAmount = totalAmount;
      plan.installmentAmount = totalAmount / (updateDto.numberOfInstallments || plan.numberOfInstallments);
    }

    // Update other fields
    if (updateDto.numberOfInstallments !== undefined) {
      plan.numberOfInstallments = updateDto.numberOfInstallments;
      plan.installmentAmount = plan.totalAmount / updateDto.numberOfInstallments;
    }
    if (updateDto.frequency !== undefined) {
      plan.frequency = updateDto.frequency;
    }
    if (updateDto.startDate !== undefined) {
      const startDate = new Date(updateDto.startDate);
      if (startDate <= new Date()) {
        throw new Error('Start date must be a future date');
      }
      plan.startDate = startDate;
      plan.nextPaymentDate = startDate;
    }
    if (updateDto.paymentMethodToken !== undefined) {
      plan.paymentMethodToken = updateDto.paymentMethodToken;
    }
    if (updateDto.metadata !== undefined) {
      plan.metadata = updateDto.metadata;
    }

    return this.planRepository.save(plan);
  }

  /**
   * Approve a pending payment plan
   * 
   * Business Rule: Only PENDING_APPROVAL plans can be approved.
   * 
   * @param id Plan ID
   * @param userId User approving the plan (must have approval permission)
   * @param organizationId Organization context
   * @returns Approved payment plan
   */
  async approve(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentPlan> {
    this.logger.log(`Approving payment plan ${id}`);

    const plan = await this.findOne(id, organizationId);

    // Only PENDING_APPROVAL plans can be approved
    if (plan.status !== PaymentPlanStatus.PENDING_APPROVAL) {
      throw new InvalidPlanStateException(
        id,
        plan.status,
        PaymentPlanStatus.PENDING_APPROVAL,
      );
    }

    const oldStatus = plan.status;

    // Update status to ACTIVE
    plan.status = PaymentPlanStatus.ACTIVE;
    plan.approvedByUserId = userId;
    plan.approvedAt = new Date();

    const updatedPlan = await this.planRepository.save(plan);

    // Publish status changed event
    await this.publishStatusChangedEvent(updatedPlan, oldStatus, PaymentPlanStatus.ACTIVE);

    this.logger.log(`Payment plan ${id} approved and activated`);

    return updatedPlan;
  }

  /**
   * Cancel a payment plan
   * 
   * Business Rule: ACTIVE and PENDING_APPROVAL plans can be canceled.
   * 
   * @param id Plan ID
   * @param userId User canceling the plan
   * @param organizationId Organization context
   * @returns Canceled payment plan
   */
  async cancel(
    id: string,
    userId: string,
    organizationId: string,
  ): Promise<PaymentPlan> {
    this.logger.log(`Canceling payment plan ${id}`);

    const plan = await this.findOne(id, organizationId);

    // Verify valid transition
    if (!VALID_PLAN_STATUS_TRANSITIONS[plan.status].includes(PaymentPlanStatus.CANCELED)) {
      throw new InvalidStateTransitionException(
        id,
        plan.status,
        PaymentPlanStatus.CANCELED,
      );
    }

    const oldStatus = plan.status;

    // Update status to CANCELED
    plan.status = PaymentPlanStatus.CANCELED;

    const updatedPlan = await this.planRepository.save(plan);

    // Publish status changed event
    await this.publishStatusChangedEvent(updatedPlan, oldStatus, PaymentPlanStatus.CANCELED);

    this.logger.log(`Payment plan ${id} canceled`);

    return updatedPlan;
  }

  /**
   * Find all payment plans with filters and pagination
   * 
   * @param query Query parameters
   * @param organizationId Organization context for tenant isolation
   * @returns Paginated plan list
   */
  async findAll(
    query: QueryPlansDto,
    organizationId: string,
  ): Promise<{ data: PaymentPlan[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, sortBy, sortOrder, ...filters } = query;

    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };

    // Apply filters
    if (filters.debtorId) where.debtorId = filters.debtorId;
    if (filters.status) where.status = filters.status;

    // Date range filters
    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
    } else if (filters.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(filters.dateFrom));
    } else if (filters.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(filters.dateTo));
    }

    const [data, total] = await this.planRepository.findAndCount({
      where,
      relations: ['debts'],
      order: { [sortBy]: sortOrder },
      take: pageSize,
      skip,
    });

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Find a single payment plan by ID
   * 
   * @param id Plan ID
   * @param organizationId Organization context for tenant isolation
   * @returns Payment plan
   * @throws PlanNotFoundException if not found
   */
  async findOne(id: string, organizationId: string): Promise<PaymentPlan> {
    const plan = await this.planRepository.findOne({
      where: { id, organizationId },
      relations: ['debts'],
    });

    if (!plan) {
      throw new PlanNotFoundException(id);
    }

    return plan;
  }

  /**
   * Process scheduled payments (called by Cloud Scheduler)
   * 
   * Workflow:
   * 1. Query for plans with nextPaymentDate = today and status = ACTIVE
   * 2. For each plan:
   *    - Call transactions.service.createScheduledPayment()
   *    - Calculate next payment date
   *    - If final payment, set status to COMPLETED
   *    - Publish event
   * 
   * @returns Summary of processed payments
   */
  async processScheduledPayments(): Promise<{
    processed: number;
    completed: number;
    failed: number;
  }> {
    this.logger.log('Processing scheduled payments');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find all active plans with nextPaymentDate = today
    const plans = await this.planRepository.find({
      where: {
        status: PaymentPlanStatus.ACTIVE,
        nextPaymentDate: LessThanOrEqual(today),
      },
    });

    let processed = 0;
    let completed = 0;
    let failed = 0;

    for (const plan of plans) {
      try {
        // Create scheduled payment
        await this.transactionsService.createScheduledPayment(
          {
            paymentPlanId: plan.id,
            amount: plan.installmentAmount,
            paymentMethodToken: plan.paymentMethodToken,
          },
          plan.organizationId,
        );

        // Update plan
        plan.paymentsCompleted += 1;
        plan.lastPaymentDate = new Date();

        // Check if this was the final payment
        if (plan.paymentsCompleted >= plan.numberOfInstallments) {
          const oldStatus = plan.status;
          plan.status = PaymentPlanStatus.COMPLETED;
          await this.planRepository.save(plan);
          await this.publishStatusChangedEvent(plan, oldStatus, PaymentPlanStatus.COMPLETED);
          completed += 1;
        } else {
          // Calculate next payment date
          plan.nextPaymentDate = calculateNextPaymentDate(
            plan.nextPaymentDate,
            plan.frequency,
          );
          await this.planRepository.save(plan);
        }

        processed += 1;
        this.logger.log(`Processed scheduled payment for plan ${plan.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to process scheduled payment for plan ${plan.id}:`,
          error,
        );
        failed += 1;
      }
    }

    this.logger.log(
      `Scheduled payment processing complete: ${processed} processed, ${completed} completed, ${failed} failed`,
    );

    return { processed, completed, failed };
  }

  /**
   * Handle failed payment (called by event subscriber)
   * 
   * Workflow:
   * 1. Increment failed payment counter
   * 2. If counter exceeds threshold (e.g., 3), set status to DEFAULTED
   * 3. Publish event
   * 
   * @param planId Plan ID
   */
  async handleFailedPayment(planId: string): Promise<void> {
    this.logger.warn(`Handling failed payment for plan ${planId}`);

    const plan = await this.planRepository.findOne({ where: { id: planId } });

    if (!plan) {
      this.logger.error(`Plan ${planId} not found for failed payment handling`);
      return;
    }

    plan.paymentsFailed += 1;

    // Default threshold: 3 failed payments
    const failureThreshold = 3;

    if (plan.paymentsFailed >= failureThreshold) {
      const oldStatus = plan.status;
      plan.status = PaymentPlanStatus.DEFAULTED;
      await this.planRepository.save(plan);
      await this.publishStatusChangedEvent(plan, oldStatus, PaymentPlanStatus.DEFAULTED);
      this.logger.warn(`Plan ${planId} marked as DEFAULTED after ${plan.paymentsFailed} failures`);
    } else {
      await this.planRepository.save(plan);
      this.logger.log(`Plan ${planId} failure count: ${plan.paymentsFailed}/${failureThreshold}`);
    }
  }

  /**
   * Publish PaymentPlanStatusChanged event
   * 
   * @param plan Updated payment plan
   * @param oldStatus Previous status
   * @param newStatus New status
   */
  private async publishStatusChangedEvent(
    plan: PaymentPlan,
    oldStatus: PaymentPlanStatus,
    newStatus: PaymentPlanStatus,
  ): Promise<void> {
    const dto = new PaymentPlanStatusChangedDto();
    dto.planId = plan.id;
    dto.organizationId = plan.organizationId;
    dto.debtorId = plan.debtorId;
    dto.oldStatus = oldStatus;
    dto.newStatus = newStatus;
    dto.totalAmount = plan.totalAmount;
    dto.numberOfInstallments = plan.numberOfInstallments;
    dto.statusChangedAt = new Date().toISOString();

    await this.eventPublisher.publish(
      EVENT_TYPES.TRANSACTIONS_PAYMENT_PLAN_STATUS_CHANGED,
      dto,
      PaymentPlanStatusChangedDto,
    );
  }
}
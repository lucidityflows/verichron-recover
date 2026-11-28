import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { TransactionHistory } from './entities/transaction-history.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateScheduledPaymentDto } from './dto/create-scheduled-payment.dto';
import { PaymentStatus, PaymentType, SortOrder } from '@verichron/enums';
import {
  TransactionNotFoundException,
  InvalidTransactionStateException,
  RefundNotAllowedException,
  PaymentProcessingException,
} from './errors/transactions.exceptions';
import { GatewaysService } from '../gateways/gateway.service';
import { DocumentsService } from '../documents/document.service';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES, EVENT_SOURCES, EVENT_TOPICS } from '@verichron/events';
import { TransactionSucceededDto } from '../events/event-dto/transactions/transaction-succeeded.dto';
import { TransactionFailedDto } from '../events/event-dto/transactions/transaction-failed.dto';
import { RefundIssuedDto } from '../events/event-dto/transactions/refund-issued.dto';

/**
 * Transactions Service
 * 
 * Core business logic for payment transaction processing.
 * Handles one-time payments, scheduled payments, and refunds.
 * Publishes events for balance updates and notifications.
 * 
 * Key responsibilities:
 * - Orchestrate payment gateway calls
 * - Maintain immutable transaction history
 * - Publish transaction events
 * - Generate payment receipts
 */
@Injectable()
export class TransactionsService {
  private readonly logger = new Logger(TransactionsService.name);

  constructor(
    @InjectRepository(TransactionHistory)
    private readonly transactionRepository: Repository<TransactionHistory>,
    private readonly gatewaysService: GatewaysService,
    private readonly documentsService: DocumentsService,
    private readonly eventPublisher: EventPublisher,
  ) {}

  /**
   * Create a one-time payment transaction
   * 
   * Workflow:
   * 1. Validate debt is active (TODO: may need api-debts call)
   * 2. Create transaction record with PENDING status
   * 3. Generate idempotency key
   * 4. Call payment gateway
   * 5. Update transaction status based on response
   * 6. Publish event
   * 7. Generate receipt document
   * 
   * @param createDto Payment details
   * @param userId User initiating the payment
   * @param organizationId Organization context
   * @returns Created transaction
   */
  async createOneTimePayment(
    createDto: CreateTransactionDto,
    userId: string,
    organizationId: string,
  ): Promise<TransactionHistory> {
    this.logger.log(
      `Creating one-time payment for debt ${createDto.debtId} in organization ${organizationId}`,
    );

    // Generate idempotency key
    const idempotencyKey = uuidv4();

    // TODO: Validate debt exists and is active
    // This may require calling api-debts: GET /debts/{id}
    // For now, we'll proceed assuming validation happens at controller level

    // Create initial transaction record with PENDING status
    const transaction = this.transactionRepository.create({
      organizationId,
      debtId: createDto.debtId,
      paymentPlanId: null, // One-time payments have no plan
      debtorId: createDto.debtorId || null, // Use provided debtorId or null
      amount: createDto.amount,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
      paymentMethodToken: createDto.paymentMethodToken,
      idempotencyKey,
      metadata: createDto.metadata || null,
    });

    const savedTransaction = (await this.transactionRepository.save(transaction)) as unknown as TransactionHistory;

    // Process payment asynchronously (in production, this might be a queue)
    this.processPaymentAsync(savedTransaction.id, idempotencyKey);

    return savedTransaction;
  }

  /**
   * Create a scheduled payment transaction (internal - called by plans module)
   * 
   * Similar flow to one-time payment but associates with payment plan.
   * 
   * @param createDto Scheduled payment details
   * @param organizationId Organization context
   * @returns Created transaction
   */
  async createScheduledPayment(
    createDto: CreateScheduledPaymentDto,
    organizationId: string,
  ): Promise<TransactionHistory> {
    this.logger.log(
      `Creating scheduled payment for plan ${createDto.paymentPlanId}`,
    );

    const idempotencyKey = uuidv4();

    // TODO: Fetch payment plan details to get debtorId and debtId(s)
    // For now, create transaction with plan reference

    const transaction = this.transactionRepository.create({
      organizationId,
      debtId: createDto.debtId || null, // Get from DTO or null
      paymentPlanId: createDto.paymentPlanId,
      debtorId: createDto.debtorId || null, // Get from DTO or null
      amount: createDto.amount,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
      paymentMethodToken: createDto.paymentMethodToken,
      idempotencyKey,
    });

    const savedTransaction = (await this.transactionRepository.save(transaction)) as unknown as TransactionHistory;

    this.processPaymentAsync(savedTransaction.id, idempotencyKey);

    return savedTransaction;
  }

  /**
   * Find recent transactions for an organization (internal use)
   */
  async findRecent(organizationId: string, pageSize: number): Promise<TransactionHistory[]> {
    return this.transactionRepository.find({
      where: { organizationId },
      order: { createdAt: SortOrder.DESC },
      take: pageSize,
    });
  }

  /**
   * Process Refund
   * 
   * Handles full or partial refunds for a completed payment.
   * 
   * 1. Validate original transaction exists and is SUCCEEDED
   * 2. Validate refund amount does not exceed original
   * 3. Create a new REFUND transaction in PENDING status
   * 4. Call payment gateway to issue refund
   * 5. Update statuses on both transactions
   * 6. Publish event
   * 
   * @param transactionId Original transaction ID
   * @param refundDto Refund details
   * @param userId User initiating the refund
   * @param organizationId Organization context
   * @returns Created refund transaction
   */
  async processRefund(
    transactionId: string,
    refundDto: ProcessRefundDto,
    userId: string,
    organizationId: string,
  ): Promise<TransactionHistory> {
    this.logger.log(`Processing refund for transaction ${transactionId}`);

    // Fetch original transaction
    const originalTransaction = await this.findOne(transactionId, organizationId);

    // Verify transaction can be refunded
    if (originalTransaction.status !== PaymentStatus.SUCCEEDED) {
      throw new InvalidTransactionStateException(
        transactionId,
        originalTransaction.status,
        PaymentStatus.SUCCEEDED,
      );
    }

    // TODO: Add logic to prevent duplicate refunds
    // Consider adding a 'refundedTransactionId' field to track if a payment was refunded

    if (originalTransaction.type !== PaymentType.PAYMENT) {
      throw new RefundNotAllowedException(
        'Only PAYMENT transactions can be refunded',
      );
    }

    // Determine refund amount
    const refundAmount = refundDto.amount || originalTransaction.amount;

    // Verify refund amount doesn't exceed original
    if (refundAmount > originalTransaction.amount) {
      throw new RefundNotAllowedException(
        `Refund amount ${refundAmount} exceeds original transaction amount ${originalTransaction.amount}`,
      );
    }

    // Generate idempotency key for refund
    const idempotencyKey = uuidv4();

    // Create refund transaction record
    const refundTransaction = this.transactionRepository.create({
      organizationId,
      debtId: originalTransaction.debtId,
      paymentPlanId: originalTransaction.paymentPlanId,
      debtorId: originalTransaction.debtorId,
      amount: refundAmount,
      type: PaymentType.REFUND,
      status: PaymentStatus.PENDING,
      paymentMethodToken: originalTransaction.paymentMethodToken,
      idempotencyKey,
      originalTransactionId: originalTransaction.id,
      metadata: { reason: refundDto.reason },
    });

    const savedRefund = await this.transactionRepository.save(refundTransaction);

    // Process refund asynchronously
    this.processRefundAsync(
      savedRefund.id,
      originalTransaction.id,
      idempotencyKey,
    );

    return savedRefund;
  }

  /**
   * Find all transactions with filters and pagination
   * 
   * @param query Query parameters
   * @param organizationId Organization context for tenant isolation
   * @returns Paginated transaction list
   */
  async findAll(
    query: QueryTransactionsDto,
    organizationId: string,
  ): Promise<{ data: TransactionHistory[]; total: number; page: number; pageSize: number }> {
    const { page, pageSize, sortBy, sortOrder, ...filters } = query;

    const skip = (page - 1) * pageSize;

    const where: any = { organizationId };

    // Apply filters
    if (filters.debtId) where.debtId = filters.debtId;
    if (filters.debtorId) where.debtorId = filters.debtorId;
    if (filters.paymentPlanId) where.paymentPlanId = filters.paymentPlanId;
    if (filters.status) where.status = filters.status;
    if (filters.type) where.type = filters.type;

    // Date range filters
    if (filters.dateFrom && filters.dateTo) {
      where.createdAt = Between(new Date(filters.dateFrom), new Date(filters.dateTo));
    } else if (filters.dateFrom) {
      where.createdAt = MoreThanOrEqual(new Date(filters.dateFrom));
    } else if (filters.dateTo) {
      where.createdAt = LessThanOrEqual(new Date(filters.dateTo));
    }

    const [data, total] = await this.transactionRepository.findAndCount({
      where,
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
   * Find a single transaction by ID
   * 
   * @param id Transaction ID
   * @param organizationId Organization context for tenant isolation
   * @returns Transaction
   * @throws TransactionNotFoundException if not found
   */
  async findOne(id: string, organizationId: string): Promise<TransactionHistory> {
    const transaction = await this.transactionRepository.findOne({
      where: { id, organizationId },
    });

    if (!transaction) {
      throw new TransactionNotFoundException(id);
    }

    return transaction;
  }

  /**
   * Process payment asynchronously
   * 
   * In production, this would be handled by a queue/worker.
   * For now, we'll process inline with error handling.
   * 
   * @param transactionId Transaction to process
   * @param idempotencyKey Idempotency key for gateway
   */
  private async processPaymentAsync(
    transactionId: string,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      // Update status to PROCESSING
      await this.transactionRepository.update(transactionId, {
        status: PaymentStatus.PROCESSING,
      });

      // Fetch transaction for gateway call
      const transaction = await this.transactionRepository.findOne({
        where: { id: transactionId },
      });

      if (!transaction) {
        this.logger.error(`Transaction ${transactionId} not found for processing`);
        return;
      }

      // Call payment gateway
      const gatewayResponse = await this.gatewaysService.processPayment({
        amount: transaction.amount,
        paymentMethodToken: transaction.paymentMethodToken,
        idempotencyKey,
      });

      if (gatewayResponse.success) {
        // Payment succeeded
        await this.transactionRepository.update(transactionId, {
          status: PaymentStatus.SUCCEEDED,
          gatewayTransactionId: gatewayResponse.transactionId,
        });

        // Fetch updated transaction
        const succeededTransaction = await this.transactionRepository.findOne({
          where: { id: transactionId },
        });

        if (!succeededTransaction) {
          throw new TransactionNotFoundException(transactionId);
        }

        // Publish TransactionSucceeded event
        const dto = new TransactionSucceededDto();
        dto.transactionId = succeededTransaction.id;
        dto.organizationId = succeededTransaction.organizationId;
        dto.debtId = succeededTransaction.debtId;
        dto.paymentPlanId = succeededTransaction.paymentPlanId;
        dto.debtorId = succeededTransaction.debtorId;
        dto.amount = succeededTransaction.amount;
        dto.gatewayTransactionId = succeededTransaction.gatewayTransactionId || null;
        dto.succeededAt = succeededTransaction.updatedAt.toISOString();

        await this.eventPublisher.publish(
          EVENT_TYPES.TRANSACTIONS_TRANSACTION_SUCCEEDED,
          dto,
          TransactionSucceededDto,
        );

        // Generate payment receipt
        await this.documentsService.generatePaymentReceipt(
          transactionId,
          succeededTransaction.organizationId,
        );

        this.logger.log(`Transaction ${transactionId} succeeded`);
      } else {
        // Payment failed
        await this.transactionRepository.update(transactionId, {
          status: PaymentStatus.FAILED,
          failureReason: gatewayResponse.failureReason,
        });

        // Fetch updated transaction
        const failedTransaction = await this.transactionRepository.findOne({
          where: { id: transactionId },
        });

        if (!failedTransaction) {
          throw new TransactionNotFoundException(transactionId);
        }

        // Publish TransactionFailed event
        const dto = new TransactionFailedDto();
        dto.transactionId = failedTransaction.id;
        dto.organizationId = failedTransaction.organizationId;
        dto.debtId = failedTransaction.debtId;
        dto.paymentPlanId = failedTransaction.paymentPlanId;
        dto.debtorId = failedTransaction.debtorId;
        dto.amount = failedTransaction.amount;
        dto.failureReason = failedTransaction.failureReason || 'Unknown error';
        dto.failedAt = failedTransaction.updatedAt.toISOString();

        await this.eventPublisher.publish(
          EVENT_TYPES.TRANSACTIONS_TRANSACTION_FAILED,
          dto,
          TransactionFailedDto,
        );

        this.logger.warn(
          `Transaction ${transactionId} failed: ${gatewayResponse.failureReason}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing payment for transaction ${transactionId}:`,
        error,
      );

      // Update to FAILED with error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.transactionRepository.update(transactionId, {
        status: PaymentStatus.FAILED,
        failureReason: `Processing error: ${errorMessage}`,
      });
    }
  }

  /**
   * Process refund asynchronously
   * 
   * @param refundTransactionId Refund transaction to process
   * @param originalTransactionId Original payment transaction
   * @param idempotencyKey Idempotency key for gateway
   */
  private async processRefundAsync(
    refundTransactionId: string,
    originalTransactionId: string,
    idempotencyKey: string,
  ): Promise<void> {
    try {
      // Update refund status to PROCESSING
      await this.transactionRepository.update(refundTransactionId, {
        status: PaymentStatus.PROCESSING,
      });

      // Fetch refund transaction
      const refundTransaction = await this.transactionRepository.findOne({
        where: { id: refundTransactionId },
      });

      if (!refundTransaction) {
        throw new TransactionNotFoundException(refundTransactionId);
      }

      // Fetch original transaction
      const originalTransaction = await this.transactionRepository.findOne({
        where: { id: originalTransactionId },
      });

      if (!originalTransaction) {
        throw new TransactionNotFoundException(originalTransactionId);
      }

      if (!originalTransaction.gatewayTransactionId) {
        throw new PaymentProcessingException(
          'Cannot refund transaction without gateway transaction ID',
        );
      }

      // Call payment gateway to process refund
      const gatewayResponse = await this.gatewaysService.processRefund({
        originalGatewayTransactionId: originalTransaction.gatewayTransactionId,
        amount: refundTransaction.amount,
        idempotencyKey,
      });

      if (gatewayResponse.success) {
        // Refund succeeded
        await this.transactionRepository.update(refundTransactionId, {
          status: PaymentStatus.SUCCEEDED,
          gatewayTransactionId: gatewayResponse.transactionId,
        });

        // Mark original transaction as REFUNDED
        await this.transactionRepository.update(originalTransactionId, {
          status: PaymentStatus.REFUNDED,
        });

        // Fetch updated refund transaction
        const succeededRefund = await this.transactionRepository.findOne({
          where: { id: refundTransactionId },
        });

        if (!succeededRefund) {
          throw new TransactionNotFoundException(refundTransactionId);
        }

        // Publish RefundIssued event
        const dto = new RefundIssuedDto();
        dto.refundTransactionId = succeededRefund.id;
        dto.originalTransactionId = originalTransactionId;
        dto.organizationId = succeededRefund.organizationId;
        dto.debtId = succeededRefund.debtId;
        dto.debtorId = succeededRefund.debtorId;
        dto.amount = succeededRefund.amount;
        dto.reason = succeededRefund.metadata?.reason || 'No reason provided';
        dto.gatewayRefundId = succeededRefund.gatewayTransactionId || null;
        dto.issuedAt = succeededRefund.updatedAt.toISOString();

        await this.eventPublisher.publish(
          EVENT_TYPES.TRANSACTIONS_REFUND_ISSUED,
          dto,
          RefundIssuedDto,
        );

        this.logger.log(`Refund ${refundTransactionId} succeeded`);
      } else {
        // Refund failed
        await this.transactionRepository.update(refundTransactionId, {
          status: PaymentStatus.FAILED,
          failureReason: gatewayResponse.failureReason,
        });

        this.logger.warn(
          `Refund ${refundTransactionId} failed: ${gatewayResponse.failureReason}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Error processing refund for transaction ${refundTransactionId}:`,
        error,
      );

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      await this.transactionRepository.update(refundTransactionId, {
        status: PaymentStatus.FAILED,
        failureReason: `Refund processing error: ${errorMessage}`,
      });
    }
  }
}
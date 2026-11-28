import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionsService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { QueryTransactionsDto } from './dto/query-transactions.dto';
import { ProcessRefundDto } from './dto/process-refund.dto';
import { CreateScheduledPaymentDto } from './dto/create-scheduled-payment.dto';
import { TransactionHistory } from './entities/transaction-history.entity';
import { Permissions } from '@verichron/auth';
import { RequestContext } from '../core/services/request-context.service';

/**
 * Transactions Controller
 *
 * Manages payment transaction operations including one-time payments,
 * scheduled payments, and refunds.
 *
 * All endpoints enforce organization-level tenant isolation.
 */
@ApiTags('Transactions')
@ApiBearerAuth()
@Controller('transactions/transactions/orgs/:organizationId')
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly requestContext: RequestContext,
  ) {}

  /**
   * Create One-Time Payment
   * 
   * Initiates a one-time payment transaction against a debt account.
   * The payment method must be tokenized client-side before submission.
   * 
   * Requires: payment:create permission
   */
  @Post()
  @Permissions('payment:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create one-time payment',
    description:
      'Initiates a one-time payment transaction. Payment methods must be tokenized ' +
      'client-side using Stripe.js or similar. Returns immediately with PENDING status; ' +
      'processing happens asynchronously. Subscribe to TransactionSucceeded or ' +
      'TransactionFailed events for final status.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Payment transaction created and queued for processing',
    type: TransactionHistory,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request body or business rule violation',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment:create permission',
  })
  async createOneTimePayment(
    @Param('organizationId') _orgId: string,
    @Body() createDto: CreateTransactionDto,
  ): Promise<TransactionHistory> {
    const userId = this.requestContext.getUserId();
    const organizationId = this.requestContext.getOrgId();

    if (!userId || !organizationId) {
      throw new InternalServerErrorException('User context not available');
    }

    return this.transactionsService.createOneTimePayment(
      createDto,
      userId,
      organizationId,
    );
  }

  /**
   * List Transactions
   * 
   * Retrieve a paginated, filterable list of transactions.
   * Results are automatically scoped to the user's organization.
   * 
   * Requires: payment:read permission
   */
  @Get()
  @Permissions('payment:read')
  @ApiOperation({
    summary: 'List transactions',
    description:
      'Retrieve a paginated list of transactions with optional filters. ' +
      'Results are automatically scoped to the requesting user\'s organization.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction list retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/TransactionHistory' },
        },
        total: { type: 'number', example: 150 },
        page: { type: 'number', example: 1 },
        pageSize: { type: 'number', example: 20 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment:read permission',
  })
  async findAll(
    @Param('organizationId') _orgId: string,
    @Query() query: QueryTransactionsDto,
  ): Promise<{
    data: TransactionHistory[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    const organizationId = this.requestContext.getOrgId();

    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }

    return this.transactionsService.findAll(query, organizationId);
  }

  /**
   * Get Transaction Details
   * 
   * Retrieve detailed information about a specific transaction.
   * Access is automatically scoped to the user's organization.
   * 
   * Requires: payment:read permission
   */
  @Get(':id')
  @Permissions('payment:read')
  @ApiOperation({
    summary: 'Get transaction details',
    description:
      'Retrieve detailed information about a specific transaction by ID. ' +
      'Access is automatically scoped to the requesting user\'s organization.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Transaction found',
    type: TransactionHistory,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Transaction not found or access denied',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment:read permission',
  })
  async findOne(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<TransactionHistory> {
    const organizationId = this.requestContext.getOrgId();

    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }

    return this.transactionsService.findOne(id, organizationId);
  }

  /**
   * Process Refund
   * 
   * Issue a refund for a completed payment transaction.
   * Supports full and partial refunds.
   * 
   * Requires: payment:create permission
   */
  @Post(':id/refund')
  @Permissions('payment:create')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Process refund',
    description:
      'Issue a refund for a successfully completed payment transaction. ' +
      'Supports full refunds (no amount specified) or partial refunds. ' +
      'The original transaction must have status SUCCEEDED. ' +
      'A new REFUND transaction is created, and the original is marked REFUNDED.',
  })
  @ApiParam({
    name: 'id',
    description: 'Original payment transaction UUID',
    example: '550e8400-e29b-41d4-a716-446655440000',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Refund transaction created and queued for processing',
    type: TransactionHistory,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid refund request (e.g., refund amount exceeds original, transaction already refunded)',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Original transaction not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'User is not authenticated',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'User lacks payment:create permission',
  })
  async processRefund(
    @Param('organizationId') _orgId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() refundDto: ProcessRefundDto,
  ): Promise<TransactionHistory> {
    const userId = this.requestContext.getUserId();
    const organizationId = this.requestContext.getOrgId();

    if (!userId || !organizationId) {
      throw new InternalServerErrorException('User context not available');
    }

    return this.transactionsService.processRefund(
      id,
      refundDto,
      userId,
      organizationId,
    );
  }
}
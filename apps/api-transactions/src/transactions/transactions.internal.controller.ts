import { Controller, Get, Post, Body, Param, Query, ParseUUIDPipe, ParseIntPipe, DefaultValuePipe, HttpCode, HttpStatus, InternalServerErrorException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transaction.service';
import { TransactionHistory } from './entities/transaction-history.entity';
import { CreateScheduledPaymentDto } from './dto/create-scheduled-payment.dto';
import { Public } from '@verichron/auth';
import { RequestContext } from '../core/services/request-context.service';

@ApiTags('Transactions (Internal)')
@Controller('internal/transactions')
export class TransactionsInternalController {
  constructor(
    private readonly transactionsService: TransactionsService,
    private readonly requestContext: RequestContext,
  ) {}

  @Get('recent/:organizationId')
  @Public()
  @ApiOperation({
    summary: 'Get recent transactions (internal)',
    description: 'Internal endpoint for event-orchestrator to fetch latest payments for the activity feed.',
  })
  @ApiParam({ name: 'organizationId', description: 'Organization UUID' })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiResponse({ status: 200, type: [TransactionHistory] })
  async findRecent(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ): Promise<TransactionHistory[]> {
    return this.transactionsService.findRecent(organizationId, pageSize);
  }

  /**
   * Create Scheduled Payment (Internal)
   * 
   * Internal endpoint for creating scheduled payment transactions.
   * Called by the plans module when processing payment plan installments.
   */
  @Post('scheduled-payment')
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create scheduled payment (internal)',
    description:
      'Internal endpoint for creating scheduled payment transactions. ' +
      'Called by the plans module when processing payment plan installments.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Scheduled payment transaction created',
    type: TransactionHistory,
  })
  async createScheduledPayment(
    @Body() createDto: CreateScheduledPaymentDto,
  ): Promise<TransactionHistory> {
    const organizationId = this.requestContext.getOrgId();

    if (!organizationId) {
      throw new InternalServerErrorException('Organization context not available');
    }

    return this.transactionsService.createScheduledPayment(
      createDto,
      organizationId,
    );
  }
}

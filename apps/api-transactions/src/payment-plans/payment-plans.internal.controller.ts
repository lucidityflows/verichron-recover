import { Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PlansService } from './payment-plan.service';
import { Public } from '@verichron/auth';

@ApiTags('Payment Plans (Internal)')
@Controller('internal/transactions/payment-plans')
export class PlansInternalController {
  constructor(private readonly plansService: PlansService) {}

  /**
   * Process Scheduled Payments (Internal)
   * 
   * Internal endpoint for processing scheduled payments.
   * Called by Cloud Scheduler daily.
   */
  @Post('process-scheduled-payments')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process scheduled payments (internal)',
    description:
      'Internal endpoint for processing scheduled payments. ' +
      'Called by Cloud Scheduler daily to process all payment plans with due payments.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Scheduled payments processed',
    schema: {
      type: 'object',
      properties: {
        processed: { type: 'number', example: 25 },
        completed: { type: 'number', example: 3 },
        failed: { type: 'number', example: 1 },
      },
    },
  })
  async processScheduledPayments(): Promise<{
    processed: number;
    completed: number;
    failed: number;
  }> {
    return this.plansService.processScheduledPayments();
  }
}

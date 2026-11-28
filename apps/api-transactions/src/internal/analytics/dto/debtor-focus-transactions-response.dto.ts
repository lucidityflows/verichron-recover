import { ApiProperty } from '@nestjs/swagger';
import { PaymentType, PaymentStatus, PaymentMethod } from '@verichron/enums';

/**
 * Individual transaction information for debtor focus view
 */
export class DebtorFocusTransactionDto {
  @ApiProperty({
    description: 'Transaction ID',
    example: 'transaction-123',
  })
  transactionId: string;

  @ApiProperty({
    description: 'Debt ID this transaction applies to',
    example: 'debt-456',
    nullable: true,
  })
  debtId: string | null;

  @ApiProperty({
    description: 'Payment plan ID if part of a plan',
    example: 'plan-789',
    nullable: true,
  })
  paymentPlanId: string | null;

  @ApiProperty({
    description: 'Transaction amount',
    example: 150.50,
  })
  amount: number;

  @ApiProperty({
    description: 'Transaction type',
    enum: PaymentType,
    example: PaymentType.PAYMENT,
  })
  type: PaymentType;

  @ApiProperty({
    description: 'Transaction status',
    enum: PaymentStatus,
    example: PaymentStatus.SUCCEEDED,
  })
  status: PaymentStatus;

  @ApiProperty({
    description: 'Payment method type',
    enum: PaymentMethod,
    example: PaymentMethod.VISA,
  })
  paymentMethodType: PaymentMethod;

  @ApiProperty({
    description: 'External gateway transaction ID',
    example: 'ch_3MmlLrLkdIwHu7ix0SNM0WaR',
    nullable: true,
  })
  gatewayTransactionId: string | null;

  @ApiProperty({
    description: 'Failure reason if status is FAILED',
    example: 'Card declined - insufficient funds',
    nullable: true,
  })
  failureReason: string | null;

  @ApiProperty({
    description: 'Transaction date',
    example: '2024-11-15T10:30:00Z',
  })
  transactionDate: string;
}

/**
 * Payment plan summary for debtor focus view
 */
export class DebtorFocusPaymentPlanDto {
  @ApiProperty({
    description: 'Payment plan ID',
    example: 'plan-123',
  })
  paymentPlanId: string;

  @ApiProperty({
    description: 'Debt ID',
    example: 'debt-456',
  })
  debtId: string;

  @ApiProperty({
    description: 'Total plan amount',
    example: 1500.00,
  })
  totalAmount: number;

  @ApiProperty({
    description: 'Amount paid so far',
    example: 600.00,
  })
  amountPaid: number;

  @ApiProperty({
    description: 'Remaining balance',
    example: 900.00,
  })
  amountRemaining: number;

  @ApiProperty({
    description: 'Installment amount',
    example: 150.00,
  })
  installmentAmount: number;

  @ApiProperty({
    description: 'Number of total installments',
    example: 10,
  })
  totalInstallments: number;

  @ApiProperty({
    description: 'Number of completed installments',
    example: 4,
  })
  completedInstallments: number;

  @ApiProperty({
    description: 'Payment plan status',
    example: 'ACTIVE',
  })
  status: string;

  @ApiProperty({
    description: 'Next payment due date',
    example: '2024-12-01',
    nullable: true,
  })
  nextPaymentDue: string | null;

  @ApiProperty({
    description: 'Payment plan start date',
    example: '2024-08-01',
  })
  startDate: string;
}

/**
 * Response DTO for debtor focus transactions endpoint
 */
export class DebtorFocusTransactionsResponseDto {
  @ApiProperty({
    description: 'List of transactions for this debtor',
    type: [DebtorFocusTransactionDto],
  })
  transactions: DebtorFocusTransactionDto[];

  @ApiProperty({
    description: 'Active payment plans for this debtor',
    type: [DebtorFocusPaymentPlanDto],
  })
  paymentPlans: DebtorFocusPaymentPlanDto[];

  @ApiProperty({
    description: 'Total amount paid (successful payments)',
    example: 2500.00,
  })
  totalAmountPaid: number;

  @ApiProperty({
    description: 'Total number of successful payments',
    example: 15,
  })
  successfulPaymentCount: number;

  @ApiProperty({
    description: 'Total number of failed payments',
    example: 2,
  })
  failedPaymentCount: number;

  @ApiProperty({
    description: 'Date of last successful payment',
    example: '2024-11-15',
    nullable: true,
  })
  lastPaymentDate: string | null;

  @ApiProperty({
    description: 'Amount of last successful payment',
    example: 150.00,
    nullable: true,
  })
  lastPaymentAmount: number | null;
}

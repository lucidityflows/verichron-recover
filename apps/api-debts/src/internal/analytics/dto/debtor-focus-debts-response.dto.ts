import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DebtStatus } from '@verichron/enums';
import type { IDebtorFocusDebt } from '@verichron/contracts';

/**
 * Individual debt information for debtor focus view
 * Implements IDebtorFocusDebt from @verichron/contracts
 */
export class DebtorFocusDebtDto implements IDebtorFocusDebt {
  @ApiProperty({
    description: 'Debt ID',
    example: 'debt-123',
  })
  id: string;

  @ApiProperty({
    description: 'Account number',
    example: 'ACC-001-2024',
  })
  accountNumber: string;

  @ApiProperty({
    description: 'Original creditor name',
    example: 'Acme Medical Center',
  })
  originalCreditorName: string;

  @ApiProperty({
    description: 'Debt type/category',
    example: 'MEDICAL',
  })
  debtType: string;

  @ApiProperty({
    description: 'Debt status',
    example: 'IN_COLLECTION',
  })
  status: string;

  @ApiProperty({
    description: 'Principal amount',
    example: 5000.00,
  })
  principalAmount: number;

  @ApiProperty({
    description: 'Interest amount',
    example: 250.00,
  })
  interestAmount: number;

  @ApiProperty({
    description: 'Fees amount',
    example: 0.00,
  })
  feesAmount: number;

  @ApiProperty({
    description: 'Current balance',
    example: 5250.00,
  })
  currentBalance: number;

  @ApiProperty({
    description: 'Days overdue since first delinquency',
    example: 120,
  })
  daysOverdue: number;

  @ApiPropertyOptional({
    description: 'Last payment date',
    example: '2024-11-01T00:00:00.000Z',
    nullable: true,
    type: Date,
  })
  lastPaymentDate: Date | null;

  @ApiPropertyOptional({
    description: 'Last payment amount',
    example: 100.00,
    nullable: true,
  })
  lastPaymentAmount: number | null;

  @ApiPropertyOptional({
    description: 'Next payment due date',
    example: '2024-12-01T00:00:00.000Z',
    nullable: true,
    type: Date,
  })
  nextPaymentDue: Date | null;

  @ApiProperty({
    description: 'Whether the debt has an active payment plan',
    example: false,
  })
  hasPaymentPlan: boolean;

  @ApiProperty({
    description: 'Whether the debt is currently disputed',
    example: false,
  })
  hasDispute: boolean;

  @ApiPropertyOptional({
    description: 'Likelihood to pay score (0-100)',
    example: 75,
  })
  ltpScore?: number;
}

/**
 * Response DTO for debtor focus debts endpoint
 */
export class DebtorFocusDebtsResponseDto {
  @ApiProperty({
    description: 'List of debts for this debtor',
    type: [DebtorFocusDebtDto],
  })
  debts: DebtorFocusDebtDto[];

  @ApiProperty({
    description: 'Total principal across all debts',
    example: 15000.00,
  })
  totalPrincipal: number;

  @ApiProperty({
    description: 'Total current balance across all debts',
    example: 15750.00,
  })
  totalBalance: number;

  @ApiProperty({
    description: 'Total interest across all debts',
    example: 750.00,
  })
  totalInterest: number;

  @ApiProperty({
    description: 'Total fees across all debts',
    example: 0.00,
  })
  totalFees: number;

  @ApiProperty({
    description: 'Number of active debts',
    example: 3,
  })
  activeDebtCount: number;

  @ApiProperty({
    description: 'Oldest delinquent date across all debts',
    example: '2024-01-15',
    nullable: true,
  })
  oldestDelinquentDate: string | null;
}

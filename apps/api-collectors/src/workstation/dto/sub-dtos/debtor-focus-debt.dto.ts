import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IDebtorFocusDebt } from '@verichron/contracts';

export class DebtorFocusDebtDto implements IDebtorFocusDebt {
  @ApiProperty({ description: "Debt's unique identifier", example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ description: "Debt's account number", example: 'ACCT123456' })
  accountNumber: string;

  @ApiProperty({ description: "Original creditor's name", example: 'Bank of Credit' })
  originalCreditorName: string;

  @ApiProperty({ description: "Type of debt", example: 'Credit Card' })
  debtType: string;

  @ApiProperty({ description: "Current status of the debt", example: 'ACTIVE' })
  status: string;

  @ApiProperty({ description: "Original principal amount of the debt", example: 1000.00 })
  principalAmount: number;

  @ApiProperty({ description: "Accrued interest amount", example: 50.25 })
  interestAmount: number;

  @ApiProperty({ description: "Accrued fees amount", example: 10.50 })
  feesAmount: number;

  @ApiProperty({ description: "Current outstanding balance", example: 1060.75 })
  currentBalance: number;

  @ApiProperty({ description: "Number of days the debt is overdue", example: 90 })
  daysOverdue: number;

  @ApiProperty({ description: "Date of the last payment made", example: '2023-10-01T00:00:00.000Z', nullable: true })
  lastPaymentDate: Date | null;

  @ApiProperty({ description: "Amount of the last payment made", example: 100.00, nullable: true })
  lastPaymentAmount: number | null;

  @ApiProperty({ description: "Date of the next scheduled payment", example: '2023-12-15T00:00:00.000Z', nullable: true })
  nextPaymentDue: Date | null;

  @ApiProperty({ description: "True if a payment plan is active for this debt", example: true })
  hasPaymentPlan: boolean;

  @ApiProperty({ description: "True if there is an open dispute for this debt", example: false })
  hasDispute: boolean;

  @ApiPropertyOptional({ description: "Likelihood to pay score (Phase 2: VTI integration)", example: 0.75 })
  ltpScore?: number;
}
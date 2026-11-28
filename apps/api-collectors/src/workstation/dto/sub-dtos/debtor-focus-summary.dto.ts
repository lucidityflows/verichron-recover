import { ApiProperty } from '@nestjs/swagger';
import { IDebtorFocusSummary } from '@verichron/contracts';

export class DebtorFocusSummaryDto implements IDebtorFocusSummary {
  @ApiProperty({ description: 'Total outstanding debt for the debtor', example: 5500.25 })
  totalDebt: number;

  @ApiProperty({ description: 'Total amount paid by the debtor', example: 1200.00 })
  totalPaid: number;

  @ApiProperty({ description: 'Remaining balance for the debtor', example: 4300.25 })
  remainingBalance: number;

  @ApiProperty({ description: 'Date of the oldest debt', example: '2022-03-01T00:00:00Z', nullable: true })
  oldestDebtDate: Date | null;

  @ApiProperty({ description: 'Number of days since the last contact attempt', example: 15, nullable: true })
  daysSinceLastContact: number | null;

  @ApiProperty({ description: 'Number of days since the last payment', example: 30, nullable: true })
  daysSinceLastPayment: number | null;

  @ApiProperty({ description: 'Number of active debts', example: 3 })
  activeDebtsCount: number;

  @ApiProperty({ description: 'Number of debts that have been fully paid', example: 2 })
  paidDebtsCount: number;
}

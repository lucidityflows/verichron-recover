import { ApiProperty } from '@nestjs/swagger';
import { IDebtorFocusPaymentHistory } from '@verichron/contracts';

export class DebtorFocusPaymentHistoryDto implements IDebtorFocusPaymentHistory {
  @ApiProperty({ description: "Unique identifier for the payment record", example: 'pay-789e0f12-a3b4-5c6d-7e8f-0123456789ab' })
  id: string;

  @ApiProperty({ description: "Date of the payment", example: '2023-11-15T00:00:00.000Z' })
  date: Date;

  @ApiProperty({ description: "Amount of the payment", example: 150.75 })
  amount: number;

  @ApiProperty({ description: "ID of the debt this payment was applied to", example: 'debt-456' })
  debtId: string;

  @ApiProperty({ description: "Account number of the debt this payment was applied to", example: 'ACCT123456' })
  debtAccountNumber: string;

  @ApiProperty({ description: "Method of payment (e.g., 'credit_card', 'bank_transfer')", example: 'credit_card' })
  paymentMethod: string;

  @ApiProperty({ description: "Transaction ID from the payment processor", example: 'tx-abc-def-ghi', nullable: true })
  transactionId: string | null;

  @ApiProperty({ description: "Status of the payment (e.g., 'completed', 'pending', 'failed')", example: 'completed' })
  status: string;
}

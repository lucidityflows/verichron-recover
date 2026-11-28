export interface IRecoveryTrendDataPoint {
  period: string;              // ISO date or "2024-Q2"
  principalOwed: string;       // Decimal as string
  amountCollected: string;     // Decimal as string
  recoveryRate: number;        // Percentage 0-100
  debtCount: number;           // Number of debts in period
}

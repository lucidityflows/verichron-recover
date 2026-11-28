export interface IDebtorFocusNote {
  id: string;
  content: string;
  createdAt: Date;
  createdBy: string;
  createdByName: string;
  isSystemGenerated: boolean;
  debtId: string | null;
}

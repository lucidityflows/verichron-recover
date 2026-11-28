export interface IDebtorFocusDocument {
  id: string;
  name: string;
  type: string;
  uploadedAt: Date;
  uploadedBy: string;
  url: string;
  debtId: string | null;
}

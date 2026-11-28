import { IDebtorFocusDebtor } from './sub-interfaces/debtor-focus-debtor.interface';
import { IDebtorFocusDebt } from './sub-interfaces/debtor-focus-debt.interface';
import { IDebtorFocusTimelineEvent } from './sub-interfaces/debtor-focus-timeline-event.interface';
import { IDebtorFocusPaymentHistory } from './sub-interfaces/debtor-focus-payment-history.interface';
import { IDebtorFocusDocument } from './sub-interfaces/debtor-focus-document.interface';
import { IDebtorFocusNote } from './sub-interfaces/debtor-focus-note.interface';
import { IDebtorFocusSummary } from './sub-interfaces/debtor-focus-summary.interface';
import { IFdcpaFlags } from './sub-interfaces/fdcpa-flags.interface'; // Added

export interface IDebtorFocusView {
  debtor: IDebtorFocusDebtor;
  debts: IDebtorFocusDebt[];
  timeline: IDebtorFocusTimelineEvent[];
  paymentHistory: IDebtorFocusPaymentHistory[];
  documents: IDebtorFocusDocument[];
  notes: IDebtorFocusNote[];
  availableActions: string[];
  summary: IDebtorFocusSummary;
  fdcpaFlags: IFdcpaFlags; // Added
}

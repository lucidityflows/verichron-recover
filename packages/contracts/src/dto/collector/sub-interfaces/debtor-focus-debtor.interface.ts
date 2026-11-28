import { PreferredContactMethod, OptOutStatus } from '@verichron/enums';
import { IDebtorAddress } from './debtor-address.interface';
import { IDebtorEmail } from './debtor-email.interface';
import { IDebtorPhone } from './debtor-phone.interface';

export interface IDebtorFocusDebtor {
  id: string;
  firstName: string;
  lastName: string;
  email: IDebtorEmail | null;
  phone: IDebtorPhone | null;
  address: IDebtorAddress | null;
  dateOfBirth: Date | null;
  ssnLast4: string | null;
  tags: string[];
  notes: string | null;
  preferredContactMethod: PreferredContactMethod;
  preferredContactTime: string | null;
  doNotContact: boolean;
  bankruptcyStatus: string | null;
  deceasedDate: Date | null;
  optOutStatus: OptOutStatus;
  attorneyInfo: any | null; // Added based on orchestrator error
}

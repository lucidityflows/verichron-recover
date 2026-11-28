import { PhoneCategory } from '@verichron/enums';

export interface ICreateDebtorPhone {
  phoneNumber: string;
  category?: PhoneCategory;
  isPrimary?: boolean;
  canReceiveSms?: boolean;
  canReceiveCalls?: boolean;
}

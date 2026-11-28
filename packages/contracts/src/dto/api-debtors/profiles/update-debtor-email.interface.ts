import { EmailCategory } from '@verichron/enums';

export interface IUpdateDebtorEmail {
  email?: string;
  emailCategory?: EmailCategory;
  isPrimary?: boolean;
}

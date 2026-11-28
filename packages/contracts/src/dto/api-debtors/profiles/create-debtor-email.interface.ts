import { EmailCategory } from '@verichron/enums';

export interface ICreateDebtorEmail {
  email: string;
  emailCategory?: EmailCategory;
  isPrimary?: boolean;
}

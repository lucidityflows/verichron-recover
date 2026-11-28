import { EmailCategory, EmailBounceStatus } from '@verichron/enums';

export interface IDebtorEmail {
  id: string;
  debtorProfileId: string;
  email: string;
  emailCategory: EmailCategory;
  isPrimary: boolean;
  isVerified: boolean;
  verifiedAt?: Date;
  bounceStatus: EmailBounceStatus;
  lastBouncedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

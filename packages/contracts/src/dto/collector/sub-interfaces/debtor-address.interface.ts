import { AddressCategory } from '@verichron/enums';

export interface IDebtorAddress {
  id: string;
  debtorProfileId: string;
  addressCategory: AddressCategory;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number;  // Added
  longitude?: number; // Added
  isVerified: boolean;
  verifiedAt?: Date;
  isCurrent: boolean;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}

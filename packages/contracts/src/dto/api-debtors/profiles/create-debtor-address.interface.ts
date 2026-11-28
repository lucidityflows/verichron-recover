import { AddressCategory } from '@verichron/enums';

export interface ICreateDebtorAddress {
  addressCategory?: AddressCategory;
  street1: string;
  street2?: string;
  street3?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isPrimary?: boolean;
  isCurrent?: boolean;
}

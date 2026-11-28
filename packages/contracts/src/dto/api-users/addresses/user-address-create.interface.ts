import { AddressCategory } from "@verichron/enums";

export interface IUserAddressCreate {
  isPrimary?: boolean;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  category?: AddressCategory;
}

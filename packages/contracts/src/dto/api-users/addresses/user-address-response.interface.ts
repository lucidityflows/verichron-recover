import { AddressCategory } from "@verichron/enums";

export interface IUserAddressResponse {
  id: string;
  isPrimary: boolean;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressCategory: AddressCategory;
  createdAt: Date;
}

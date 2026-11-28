import { PhoneCategory } from "@verichron/enums";
export interface IUserPhoneNumberCreate {
  phoneNumber: string;
  isPrimary?: boolean;
  category?: PhoneCategory;
}

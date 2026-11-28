import { PhoneCategory } from "@verichron/enums";

export interface IUserPhoneNumberUpdate {
  isPrimary?: boolean;
  category?: PhoneCategory;
}

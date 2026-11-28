import { PhoneCategory } from "@verichron/enums";

export interface IUserPhoneNumberResponse {
  id: string;
  phoneNumber: string;
  isPrimary: boolean;
  category: PhoneCategory;
}

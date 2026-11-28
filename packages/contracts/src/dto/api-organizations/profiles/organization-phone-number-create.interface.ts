import { PhoneCategory } from "@verichron/enums";

export interface IOrganizationPhoneNumberCreate {
  phoneNumber: string;
  isPrimary?: boolean;
  category?: PhoneCategory;
}

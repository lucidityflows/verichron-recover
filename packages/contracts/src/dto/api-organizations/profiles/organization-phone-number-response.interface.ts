import { PhoneCategory } from "@verichron/enums";

export interface IOrganizationPhoneNumberResponse {
  id: string;
  phoneNumber: string;
  isPrimary: boolean;
  category: PhoneCategory;
  createdAt: Date;
}

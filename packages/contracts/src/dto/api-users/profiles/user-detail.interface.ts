import { IUserSummary } from './user-summary.interface';
import { IUserMembership } from './user-membership.interface';
import { IUserEmailResponse } from '../emails'; // Placeholder
import { IUserPhoneNumberResponse } from '../phones/'; // Placeholder
import { IUserAddressResponse } from '../addresses'; // Placeholder

export interface IUserDetail extends IUserSummary {
  memberships: IUserMembership[];
  emails: IUserEmailResponse[];
  phoneNumbers: IUserPhoneNumberResponse[];
  addresses: IUserAddressResponse[];
  createdAt: Date;
  updatedAt: Date;
}

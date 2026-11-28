import { IUserSummary } from './user-summary.interface';
import { IUserMembership } from './user-membership.interface';

export interface IUserResponse extends IUserSummary {
  memberships: IUserMembership[];
  createdAt: Date;
  updatedAt: Date;
}

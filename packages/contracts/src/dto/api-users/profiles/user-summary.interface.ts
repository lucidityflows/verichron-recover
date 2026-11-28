import { UserStatus, UserRole } from "@verichron/enums";

export interface IUserSummary {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  status: UserStatus;
  roleName?: UserRole;
}

import { UserStatus } from "@verichron/enums";

export interface IUpdateUser {
  firstName?: string;
  lastName?: string;
  status?: UserStatus;
}

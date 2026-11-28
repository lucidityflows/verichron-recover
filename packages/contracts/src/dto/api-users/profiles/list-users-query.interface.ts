import { UserStatus } from "@verichron/enums";

export interface IListUsersQuery {
  page?: number;
  pageSize?: number;
  status?: UserStatus;
  search?: string;
  roleId?: string;
}

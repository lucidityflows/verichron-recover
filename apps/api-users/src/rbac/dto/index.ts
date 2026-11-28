/* Roles */
export { CreateRoleDto } from './roles/create-role.dto';
export { UpdateRoleDto } from './roles/update-role.dto';
export { RoleResponseDto } from './roles/role-response.dto';
export { RoleDetailDto } from './roles/role-detail.dto';
export { ListRolesQueryDto, PaginatedRolesResponseDto } from './roles/list-roles.dto';

/* Assignments */
export { AssignRoleToUserDto } from './assignments/assign-role-to-user.dto';
export { RemoveRoleFromUserDto } from './assignments/assign-role-to-user.dto';
export { UserRoleAssignmentDto } from './assignments/user-role-assignment.dto';

/*Permissions */
export { AssignPermissionToRoleDto, AssignPermissionsToRoleDto } from './permissions/assign-permission.dto';
export { PermissionResponseDto } from './permissions/permission-response.dto';
export { 
    ListPermissionsQueryDto,
    PaginatedPermissionsResponseDto,
    PermissionsByResourceDto
} from './permissions/list-permissions.dto';
export { GroupedPermissionsResponseDto } from './permissions/grouped-permissions-response.dto';

/* Events */
export { PermissionsChangedEventDto } from './events/permissions-changed.dto';
export { RoleAssignedEventDto } from './events/role-assigned.dto';
export { RoleCreatedEventDto } from './events/role-created.dto';
export { RoleDeletedEventDto } from './events/role-deleted.dto';
export { RoleUnassignedEventDto } from './events/role-unassigned.dto';
export { RoleUpdatedEventDto } from './events/role-updated.dto';

/* Validations */
export {
    CheckPermissionDto,
    CheckPermissionsDto,
    PermissionCheckResultDto,
    PermissionsCheckResultDto
} from './validation/check-permission.dto';
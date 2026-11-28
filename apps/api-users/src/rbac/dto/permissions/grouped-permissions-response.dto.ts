import { ApiProperty } from "@nestjs/swagger";
import { PermissionsByResourceDto } from "./list-permissions.dto";
import { IGroupedPermissionsResponse } from "@verichron/contracts";


export class GroupedPermissionsResponseDto implements IGroupedPermissionsResponse {
  @ApiProperty({
    description: 'Permissions grouped by resource',
    type: [PermissionsByResourceDto],
  })
  groups: PermissionsByResourceDto[];
}
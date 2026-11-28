import { ApiProperty } from "@nestjs/swagger";

export class PermissionsChangedEventDto {
  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty({ type: [String] })
  addedPermissions: string[];

  @ApiProperty({ type: [String] })
  removedPermissions: string[];

  @ApiProperty()
  changedAt: string;
}

import { ApiProperty } from "@nestjs/swagger";

export class RoleDeletedEventDto {
  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty()
  deletedAt: string;
}


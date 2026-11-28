import { ApiProperty } from "@nestjs/swagger";

export class RoleUnassignedEventDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  unassignedBy?: string;

  @ApiProperty()
  unassignedAt: string;
}


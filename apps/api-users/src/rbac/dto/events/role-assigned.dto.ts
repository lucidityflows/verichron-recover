import { ApiProperty } from "@nestjs/swagger";

export class RoleAssignedEventDto {
  @ApiProperty({ format: 'uuid' })
  userId: string;

  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty({ format: 'uuid', nullable: true })
  assignedBy?: string;

  @ApiProperty()
  assignedAt: string;
}

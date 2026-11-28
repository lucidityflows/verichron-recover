import { ApiProperty } from "@nestjs/swagger";

export class RoleUpdatedEventDto {
  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty({ type: [String] })
  updatedFields: string[];

  @ApiProperty()
  updatedAt: string;
}

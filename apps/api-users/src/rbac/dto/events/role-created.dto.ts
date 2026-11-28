import { ApiProperty  } from "@nestjs/swagger";

// src/rbac/dto/events/role-created.dto.ts
export class RoleCreatedEventDto {
  @ApiProperty({ format: 'uuid' })
  roleId: string;

  @ApiProperty({ format: 'uuid' })
  organizationId: string;

  @ApiProperty()
  roleName: string;

  @ApiProperty()
  isSystemRole: boolean;

  @ApiProperty()
  createdAt: string;
}



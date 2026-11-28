import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignRoleDto {
  @ApiProperty({
    description: 'The ID of the role to assign to the user.',
    format: 'uuid',
  })
  @IsUUID()
  roleId: string;
}

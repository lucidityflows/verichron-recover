import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { TeamMemberRole } from '@verichron/enums';

export class AddTeamMemberDto {
  @ApiProperty({
    description: 'User ID of the member to add to the team (from api-users)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  userId!: string;

  @ApiPropertyOptional({
    description: 'Whether this team should be designated as the user\'s primary team',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @ApiPropertyOptional({
    description: 'Role of the member within this specific team',
    enum: TeamMemberRole,
    enumName: 'TeamMemberRole',
    example: TeamMemberRole.MEMBER,
    default: TeamMemberRole.MEMBER,
  })
  @IsEnum(TeamMemberRole)
  @IsOptional()
  roleOnTeam?: TeamMemberRole;
}

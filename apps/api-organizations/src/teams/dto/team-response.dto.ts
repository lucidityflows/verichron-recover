import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TeamResponseDto {
  @ApiProperty({ description: 'Unique team identifier', format: 'uuid' })
  id!: string;

  @ApiProperty({ description: 'Organization ID this team belongs to', format: 'uuid' })
  organizationId!: string;

  @ApiProperty({ description: 'Name of the team' })
  name!: string;

  @ApiPropertyOptional({ description: 'Description of the team' })
  description?: string;

  @ApiPropertyOptional({ description: 'User ID of the team manager (from api-users)', format: 'uuid' })
  managerUserId?: string;

  @ApiProperty({ description: 'Number of members in the team', example: 12 })
  memberCount!: number;

  @ApiProperty({ description: 'Timestamp when the team was created', format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ description: 'Timestamp when the team was last updated', format: 'date-time' })
  updatedAt!: string;
}

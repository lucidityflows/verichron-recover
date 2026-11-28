import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsString, IsNotEmpty, MaxLength, IsOptional } from 'class-validator';

export class CreateTeamDto {
  @ApiProperty({
    description: 'Name of the team',
    example: 'West Coast Team',
    maxLength: 255,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({
    description: 'Description of the team',
    example: 'California and Nevada collectors',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'User ID of the team manager (from api-users)',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID()
  @IsOptional()
  managerUserId?: string;
}

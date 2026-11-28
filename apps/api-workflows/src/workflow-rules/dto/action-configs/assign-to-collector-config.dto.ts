import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsInt, Min } from 'class-validator';

export class AssignToCollectorConfigDto {
  @ApiPropertyOptional({ description: 'Specific collector ID to assign to' })
  @IsUUID()
  @IsOptional()
  collectorId?: string;

  @ApiPropertyOptional({ description: 'Assignment strategy if no specific collector', example: 'ROUND_ROBIN' })
  @IsString()
  @IsOptional()
  strategy?: string;

  @ApiPropertyOptional({ description: 'Delay in days before assigning', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayDays?: number;
}

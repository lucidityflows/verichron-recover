import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsInt, Min, IsOptional } from 'class-validator';
import { WorkflowPriority } from '@verichron/enums';

export class UpdatePriorityConfigDto {
  @ApiProperty({ description: 'New priority level', enum: WorkflowPriority, enumName: 'WorkflowPriority' })
  @IsEnum(WorkflowPriority)
  @IsNotEmpty()
  priority: WorkflowPriority;

  @ApiPropertyOptional({ description: 'Delay in days before updating priority', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayDays?: number;
}

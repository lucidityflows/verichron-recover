import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, IsEnum } from 'class-validator';
import { ActionType, WorkflowPriority } from '@verichron/enums';

export class CreateTaskConfigDto {
  @ApiProperty({ description: 'Type of task to create', enum: ActionType, enumName: 'ActionType' })
  @IsEnum(ActionType)
  @IsNotEmpty()
  taskType: ActionType;

  @ApiProperty({ description: 'Priority of the task', enum: WorkflowPriority, enumName: 'WorkflowPriority' })
  @IsEnum(WorkflowPriority)
  @IsNotEmpty()
  priority: WorkflowPriority;

  @ApiPropertyOptional({ description: 'Due date offset in days from trigger', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  dueDateOffset?: number;

  @ApiPropertyOptional({ description: 'Description or notes for the task' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Delay in days before creating the task', default: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  delayDays?: number;
}

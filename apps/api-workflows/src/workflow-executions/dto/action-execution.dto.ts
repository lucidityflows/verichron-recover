import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsNumber, IsEnum } from 'class-validator';
import { ActionExecutionStatus } from '@verichron/enums'; // Import from @verichron/enums

export class ActionExecutionDto {
  @ApiProperty({
    description: 'ID of the action in the WorkflowRule',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsString()
  @IsNotEmpty()
  actionId: string;

  @ApiProperty({
    description: 'Type of action performed',
    example: 'ASSIGN_TO_COLLECTOR',
  })
  @IsString()
  @IsNotEmpty()
  actionType: string;

  @ApiProperty({
    description: 'Status of the action execution',
    enum: ActionExecutionStatus,
    example: ActionExecutionStatus.SUCCESS,
  })
  @IsEnum(ActionExecutionStatus)
  status: ActionExecutionStatus;

  @ApiPropertyOptional({
    description: 'Short summary of the action\'s outcome',
    example: 'Assigned to John Doe',
  })
  @IsOptional()
  @IsString()
  result?: string;

  @ApiPropertyOptional({
    description: 'Error message if action failed',
    example: 'Collector not found',
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiProperty({
    description: 'Timestamp when the action was executed',
    example: '2023-10-27T10:00:00.000Z',
  })
  @IsDateString()
  executedAt: Date;

  @ApiPropertyOptional({
    description: 'Duration of the action execution in milliseconds',
    example: 120,
  })
  @IsOptional()
  @IsNumber()
  duration?: number;
}

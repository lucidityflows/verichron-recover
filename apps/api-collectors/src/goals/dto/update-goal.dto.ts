import { ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateGoalDto } from './create-goal.dto';
import { IUpdateGoal } from '@verichron/contracts';

export class UpdateGoalDto extends PartialType(CreateGoalDto) implements IUpdateGoal {
  @ApiPropertyOptional({
    description: 'Whether the goal is currently active',
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Whether the goal has been archived',
  })
  @IsBoolean()
  @IsOptional()
  isArchived?: boolean;
}

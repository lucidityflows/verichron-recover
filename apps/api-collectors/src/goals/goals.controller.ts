import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { GoalsService } from './goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalResponseDto } from './dto/goal-response.dto';
import { GoalProgressResponseDto } from './dto/goal-progress-response.dto';
import { JwtAuthGuard, CurrentUserId } from '@verichron/auth';
import { GoalScope, GoalType, GoalPeriod } from '@verichron/enums';

@ApiTags('Goals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('collectors/goals/orgs/:organizationId')
export class GoalsController {
  constructor(private readonly goalsService: GoalsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new goal' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 201, type: GoalResponseDto })
  async createGoal(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.createGoal(organizationId, dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'List goals with filters' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiQuery({ name: 'scope', enum: GoalScope, required: false })
  @ApiQuery({ name: 'type', enum: GoalType, required: false })
  @ApiQuery({ name: 'period', enum: GoalPeriod, required: false })
  @ApiQuery({ name: 'teamId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [GoalResponseDto] })
  async listGoals(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('scope') scope?: GoalScope,
    @Query('type') type?: GoalType,
    @Query('period') period?: GoalPeriod,
    @Query('teamId') teamId?: string,
    @Query('isActive') isActive?: boolean,
  ): Promise<GoalResponseDto[]> {
    return this.goalsService.listGoals(organizationId, { scope, type, period, teamId, isActive });
  }

  @Get(':goalId')
  @ApiOperation({ summary: 'Get goal by ID' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  async getGoal(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ): Promise<GoalResponseDto> {
    const goals = await this.goalsService.listGoals(organizationId, { id: goalId });
    if (goals.length === 0) throw new Error('Goal not found');
    return goals[0];
  }

  @Patch(':goalId')
  @ApiOperation({ summary: 'Update goal' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, type: GoalResponseDto })
  async updateGoal(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateGoalDto,
  ): Promise<GoalResponseDto> {
    return this.goalsService.updateGoal(organizationId, goalId, dto, userId);
  }

  @Delete(':goalId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete goal (soft delete)' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 204 })
  async deleteGoal(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    return this.goalsService.deleteGoal(organizationId, goalId, userId);
  }

  @Get(':goalId/progress')
  @ApiOperation({ summary: 'Get real-time goal progress' })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({ status: 200, type: GoalProgressResponseDto })
  async getGoalProgress(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('goalId', ParseUUIDPipe) goalId: string,
  ): Promise<GoalProgressResponseDto> {
    return this.goalsService.getGoalProgress(goalId);
  }
}

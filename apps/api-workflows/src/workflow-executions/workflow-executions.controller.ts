import { Controller, Get, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowExecutionsService } from './workflow-executions.service';
import { WorkflowExecutionResponseDto } from './dto/workflow-execution-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Workflow Executions')
@ApiBearerAuth()
@Controller('workflows/executions/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class WorkflowExecutionsController {
  constructor(private readonly workflowExecutionsService: WorkflowExecutionsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_EXECUTIONS_VIEW)
  @ApiOperation({ summary: 'Get workflow execution history for an organization' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved workflow execution history.',
    type: [WorkflowExecutionResponseDto],
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('pageSize') pageSize?: number,
    @Query('ruleId') ruleId?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<WorkflowExecutionResponseDto[]> {
    return this.workflowExecutionsService.findAll(organizationId, {
      pageSize,
      ruleId,
      status,
      startDate,
      endDate,
    });
  }

  @Get(':executionId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_EXECUTIONS_VIEW)
  @ApiOperation({ summary: 'Get detailed workflow execution record by ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved detailed workflow execution record.',
    type: WorkflowExecutionResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('executionId', ParseUUIDPipe) executionId: string,
  ): Promise<WorkflowExecutionResponseDto> {
    return this.workflowExecutionsService.findOne(organizationId, executionId);
  }
}
import {
  Controller,
  Post,
  Body,
  Get,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam, ApiExtraModels } from '@nestjs/swagger';
import { WorkflowRulesService } from './workflow-rules.service';
import { CreateWorkflowRuleDto } from './dto/create-workflow-rule.dto';
import { UpdateWorkflowRuleDto } from './dto/update-workflow-rule.dto';
import { WorkflowRuleResponseDto } from './dto/workflow-rule-response.dto';
import { 
  SendEmailConfigDto, 
  CreateTaskConfigDto, 
  UpdatePriorityConfigDto, 
  AssignToCollectorConfigDto 
} from './dto/action-configs';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Workflow Rules')
@ApiBearerAuth()
@ApiExtraModels(SendEmailConfigDto, CreateTaskConfigDto, UpdatePriorityConfigDto, AssignToCollectorConfigDto)
@Controller('workflows/rules/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class WorkflowRulesController {
  constructor(private readonly workflowRulesService: WorkflowRulesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_CREATE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new workflow rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The workflow rule has been successfully created.',
    type: WorkflowRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createWorkflowRuleDto: CreateWorkflowRuleDto,
  ): Promise<WorkflowRuleResponseDto> {
    return this.workflowRulesService.create(organizationId, createWorkflowRuleDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_VIEW)
  @ApiOperation({ summary: 'Get all workflow rules for an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved workflow rules.',
    type: [WorkflowRuleResponseDto],
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<WorkflowRuleResponseDto[]> {
    return this.workflowRulesService.findAll(organizationId);
  }

  @Get(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_VIEW)
  @ApiOperation({ summary: 'Get a specific workflow rule by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved workflow rule.',
    type: WorkflowRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<WorkflowRuleResponseDto> {
    return this.workflowRulesService.findOne(organizationId, ruleId);
  }

  @Patch(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_EDIT)
  @ApiOperation({ summary: 'Update an existing workflow rule' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The workflow rule has been successfully updated.',
    type: WorkflowRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() updateWorkflowRuleDto: UpdateWorkflowRuleDto,
  ): Promise<WorkflowRuleResponseDto> {
    return this.workflowRulesService.update(organizationId, ruleId, updateWorkflowRuleDto);
  }

  @Delete(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow rule' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The workflow rule has been successfully deleted.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<void> {
    return this.workflowRulesService.remove(organizationId, ruleId);
  }

  @Patch(':ruleId/toggle')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_RULES_TOGGLE)
  @ApiOperation({ summary: 'Toggle enable/disable status of a workflow rule' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Workflow rule status has been successfully toggled.',
    type: WorkflowRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  toggle(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<WorkflowRuleResponseDto> {
    return this.workflowRulesService.toggle(organizationId, ruleId);
  }
}
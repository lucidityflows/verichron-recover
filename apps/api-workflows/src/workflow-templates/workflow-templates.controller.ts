import { Controller, Get, Param, Query, ParseUUIDPipe, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { WorkflowTemplatesService } from './workflow-templates.service';
import { WorkflowTemplateResponseDto } from './dto/workflow-template-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Workflow Templates')
@ApiBearerAuth()
@Controller('workflows/templates/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class WorkflowTemplatesController {
  constructor(private readonly workflowTemplatesService: WorkflowTemplatesService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({ summary: 'Get all system-defined workflow templates' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved workflow templates.',
    type: [WorkflowTemplateResponseDto],
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string, // Templates are global, but filtered by org context for consistency
    @Query('category') category?: string,
  ): Promise<WorkflowTemplateResponseDto[]> {
    return this.workflowTemplatesService.findAll(organizationId, category);
  }

  @Get(':templateId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({ summary: 'Get a specific system-defined workflow template by ID' })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved workflow template.',
    type: WorkflowTemplateResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('templateId') templateId: string,
  ): Promise<WorkflowTemplateResponseDto> {
    return this.workflowTemplatesService.findOne(organizationId, templateId);
  }
}
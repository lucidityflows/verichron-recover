import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth
} from '@nestjs/swagger';
import { TemplatesService } from './templates.service';
import {
  CreateTemplateDto,
  UpdateTemplateDto,
  QueryTemplatesDto,
  PreviewTemplateDto,
} from './dto';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';
import { Template } from './entities/template.entity';

@ApiTags('Communication Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('communications/templates/orgs/:organizationId')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW) // Need specific write perm? Using existing one
  @ApiOperation({ summary: 'Create a new communication template' })
  @ApiResponse({
    status: 201,
    description: 'The template has been successfully created.',
    type: Template,
  })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createTemplateDto: CreateTemplateDto,
  ): Promise<Template> {
    return this.templatesService.create(organizationId, createTemplateDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({ summary: 'List all communication templates for an organization' })
  @ApiResponse({
    status: 200,
    description: 'A list of templates.',
    type: [Template],
  })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: QueryTemplatesDto,
  ): Promise<Template[]> {
    return this.templatesService.findAll(organizationId, query);
  }

  @Get(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({ summary: 'Get a single template by ID' })
  @ApiResponse({ status: 200, description: 'The requested template.', type: Template })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<Template> {
    return this.templatesService.findOne(id, organizationId);
  }

  @Put(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({
    summary: 'Update a template',
    description: 'This creates a new, active version of the template.',
  })
  @ApiResponse({ status: 200, description: 'The updated template.', type: Template })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ): Promise<Template> {
    return this.templatesService.update(id, organizationId, updateTemplateDto);
  }

  @Delete(':id')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate a template' })
  @ApiResponse({
    status: 204,
    description: 'The template has been successfully deactivated.',
  })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.templatesService.remove(id, organizationId);
  }

  @Post(':id/preview')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_TEMPLATES_VIEW)
  @ApiOperation({ summary: 'Preview a rendered template' })
  @ApiResponse({ status: 200, description: 'The rendered template output.' })
  @ApiResponse({ status: 404, description: 'Template not found.' })
  async preview(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() previewDto: PreviewTemplateDto,
  ): Promise<any> {
    return this.templatesService.renderPreview(
      id,
      organizationId,
      previewDto.context,
    );
  }
}

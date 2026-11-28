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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { EscalationRulesService } from './escalation-rules.service';
import { CreateEscalationRuleDto } from './dto/create-escalation-rule.dto';
import { UpdateEscalationRuleDto } from './dto/update-escalation-rule.dto';
import { EscalationRuleResponseDto } from './dto/escalation-rule-response.dto';
import { Permissions, JwtAuthGuard, PermissionsGuard } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

@ApiTags('Escalation Rules')
@ApiBearerAuth()
@Controller('workflows/escalations/orgs/:organizationId')
@UseGuards(JwtAuthGuard)
export class EscalationRulesController {
  constructor(private readonly escalationRulesService: EscalationRulesService) {}

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new escalation rule' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'The escalation rule has been successfully created.',
    type: EscalationRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() createEscalationRuleDto: CreateEscalationRuleDto,
  ): Promise<EscalationRuleResponseDto> {
    return this.escalationRulesService.create(organizationId, createEscalationRuleDto);
  }

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ESCALATIONS_VIEW)
  @ApiOperation({ summary: 'Get all escalation rules for an organization' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved escalation rules.',
    type: [EscalationRuleResponseDto],
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string): Promise<EscalationRuleResponseDto[]> {
    return this.escalationRulesService.findAll(organizationId);
  }

  @Get(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ESCALATIONS_VIEW)
  @ApiOperation({ summary: 'Get a specific escalation rule by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Successfully retrieved escalation rule.',
    type: EscalationRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ): Promise<EscalationRuleResponseDto> {
    return this.escalationRulesService.findOne(organizationId, ruleId);
  }

  @Patch(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE)
  @ApiOperation({ summary: 'Update an existing escalation rule' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'The escalation rule has been successfully updated.',
    type: EscalationRuleResponseDto,
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
    @Body() updateEscalationRuleDto: UpdateEscalationRuleDto,
  ): Promise<EscalationRuleResponseDto> {
    return this.escalationRulesService.update(organizationId, ruleId, updateEscalationRuleDto);
  }

  @Delete(':ruleId')
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.WORKFLOWS_ESCALATIONS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an escalation rule' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'The escalation rule has been successfully deleted.',
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
    return this.escalationRulesService.remove(organizationId, ruleId);
  }
}
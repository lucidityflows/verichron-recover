import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { DemographicsService } from './demographics.service';
import { CreateDemographicsDto } from './dto/create-demographics.dto';
import { UpdateDemographicsDto } from './dto/update-demographics.dto';
import { PartialUpdateDemographicsDto } from './dto/partial-update-demographics.dto';
import { DebtorDemographics } from './entities/debtor-demographics.entity';
import { JwtAuthGuard, PermissionsGuard, Permissions } from '@verichron/auth';
import { OrganizationPermission } from '@verichron/enums';

/**
 * Demographics Controller
 * 
 * Manages secure access to sensitive debtor demographic information.
 */
@ApiTags('Debtor Demographics')
@ApiBearerAuth()
@ApiSecurity('sensitive-data', ['This endpoint handles sensitive PII'])
@Controller('debtors/demographics/orgs/:organizationId/debtors/:debtorId')
@UseGuards(JwtAuthGuard)
export class DemographicsController {
  constructor(private readonly demographicsService: DemographicsService) {}

  @Get()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEMOGRAPHICS_READ)
  @ApiOperation({
    summary: 'Get demographics for a debtor',
    description:
      'Retrieve sensitive demographic information for a debtor. ' +
      'Access is logged for compliance audit trails. ' +
      'Organization must have access to the debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographics retrieved successfully',
    type: DebtorDemographics,
  })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ): Promise<DebtorDemographics> {
    return this.demographicsService.findOne(debtorId);
  }

  @Post()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEMOGRAPHICS_WRITE)
  @ApiOperation({
    summary: 'Create demographics for a debtor',
    description:
      'Create a new demographics record for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 201,
    description: 'Demographics created successfully',
    type: DebtorDemographics,
  })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() createDto: CreateDemographicsDto,
  ): Promise<DebtorDemographics> {
    return this.demographicsService.create(
      debtorId,
      createDto,
    );
  }

  @Put()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEMOGRAPHICS_WRITE)
  @ApiOperation({
    summary: 'Update demographics (full replacement)',
    description:
      'Fully update demographics for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographics updated successfully',
    type: DebtorDemographics,
  })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() updateDto: UpdateDemographicsDto,
  ): Promise<DebtorDemographics> {
    return this.demographicsService.update(
      debtorId,
      updateDto,
    );
  }

  @Patch()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEMOGRAPHICS_WRITE)
  @ApiOperation({
    summary: 'Partially update demographics',
    description:
      'Update specific fields of demographics record.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Demographics updated successfully',
    type: DebtorDemographics,
  })
  async partialUpdate(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
    @Body() partialUpdateDto: PartialUpdateDemographicsDto,
  ): Promise<DebtorDemographics> {
    return this.demographicsService.partialUpdate(
      debtorId,
      partialUpdateDto,
    );
  }

  @Delete()
  @UseGuards(PermissionsGuard)
  @Permissions(OrganizationPermission.DEBTORS_DELETE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete demographics for a debtor',
    description:
      'Permanently delete demographics record for a debtor.',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Organization UUID',
    format: 'uuid',
  })
  @ApiParam({
    name: 'debtorId',
    description: 'Debtor UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Demographics deleted successfully',
  })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('debtorId', ParseUUIDPipe) debtorId: string,
  ): Promise<void> {
    return this.demographicsService.remove(debtorId);
  }
}
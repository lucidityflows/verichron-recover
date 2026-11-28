import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard, OrgContextGuard, PermissionsGuard } from '@verichron/auth';
import { Permissions, CurrentUserId } from '@verichron/auth';
import { OrganizationPermission, PlatformPermission } from '@verichron/enums';
import { CreditorsService } from './creditors.service';
import {
  CreateCreditorDto,
  UpdateCreditorDto,
  CreditorResponseDto,
  MergeCreditorDto,
} from './dto';
import { PaginatedCreditorResponseDto } from './dto/paginated-creditor-response.dto';

/**
 * Creditors Controller
 *
 * Public REST API for creditor CRUD operations.
 * Available to organization users with appropriate permissions.
 *
 * **Permissions:**
 * - DEBTS_READ: View creditors and details
 * - DEBTS_WRITE: Create, edit, merge creditors
 * - DEBTS_DELETE: Soft delete creditors
 *
 * **Use Cases:**
 * - Admin reviews creditor master data
 * - Manager merges duplicate creditors via UI
 * - Bulk cleanup operations
 * - Export creditor list for analytics
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@ApiTags('Creditors')
@ApiBearerAuth()
@Controller('debts/creditors/orgs/:organizationId')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class CreditorsController {
  constructor(private readonly creditorsService: CreditorsService) {}

  @Get()
  @Permissions(OrganizationPermission.DEBTS_READ, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({ summary: 'List all creditors for organization' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search creditors by name or EIN',
  })
  @ApiQuery({
    name: 'onlyMasters',
    required: false,
    type: Boolean,
    description: 'Only return master creditors (exclude duplicates)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (1-indexed)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Results per page (max 100)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of creditors',
    type: PaginatedCreditorResponseDto,
  })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query('search') search?: string,
    @Query('onlyMasters', new DefaultValuePipe(true)) onlyMasters?: boolean,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<PaginatedCreditorResponseDto> {
    // Enforce max limit
    const safeLimit = Math.min(limit || 50, 100);

    const { creditors, total } = await this.creditorsService.findAll(
      organizationId,
      {
        search,
        onlyMasters,
        page,
        limit: safeLimit,
      },
    );

    return {
      creditors: creditors.map((c) => CreditorResponseDto.fromEntity(c)),
      total,
    };
  }

  @Get(':id')
  @Permissions(OrganizationPermission.DEBTS_READ, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({ summary: 'Get creditor by ID' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Creditor details',
    type: CreditorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creditor not found' })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<CreditorResponseDto> {
    const creditor = await this.creditorsService.findById(organizationId, id);
    return CreditorResponseDto.fromEntity(creditor);
  }

  @Post()
  @Permissions(OrganizationPermission.DEBTS_WRITE, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({ summary: 'Create a new creditor (manual entry)' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 201,
    description: 'Creditor created',
    type: CreditorResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateCreditorDto,
  ): Promise<CreditorResponseDto> {
    const creditor = await this.creditorsService.create(organizationId, dto);
    return CreditorResponseDto.fromEntity(creditor);
  }

  @Patch(':id')
  @Permissions(OrganizationPermission.DEBTS_WRITE, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({ summary: 'Update creditor details' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Creditor updated',
    type: CreditorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creditor not found' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCreditorDto,
  ): Promise<CreditorResponseDto> {
    const creditor = await this.creditorsService.update(
      organizationId,
      id,
      dto,
    );
    return CreditorResponseDto.fromEntity(creditor);
  }

  @Delete(':id')
  @Permissions(OrganizationPermission.DEBTS_DELETE, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({ summary: 'Soft delete a creditor' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Creditor deleted' })
  @ApiResponse({ status: 404, description: 'Creditor not found' })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete creditor with active debts',
  })
  async delete(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ message: string }> {
    await this.creditorsService.delete(organizationId, id);
    return { message: 'Creditor deleted successfully' };
  }

  @Post(':id/merge')
  @Permissions(OrganizationPermission.DEBTS_WRITE, PlatformPermission.DEBTS_MANAGE)
  @ApiOperation({
    summary: 'Merge duplicate creditor into master (reassigns all debts)',
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID of duplicate creditor to merge (will be marked as duplicate)',
  })
  @ApiResponse({
    status: 200,
    description: 'Creditor merged successfully',
    type: CreditorResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Creditor not found' })
  @ApiResponse({
    status: 400,
    description: 'Invalid merge operation (cannot merge master into duplicate)',
  })
  async merge(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) duplicateId: string,
    @Body() dto: MergeCreditorDto,
  ): Promise<CreditorResponseDto> {
    const masterCreditor = await this.creditorsService.merge(
      organizationId,
      userId,
      duplicateId,
      dto.masterCreditorId,
      dto.notes,
    );

    return CreditorResponseDto.fromEntity(masterCreditor);
  }
}

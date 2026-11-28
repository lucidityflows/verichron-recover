import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
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
import { Permissions, OrganizationId, CurrentUserId } from '@verichron/auth';
import { OrganizationPermission, CreditorConflictStatus } from '@verichron/enums';
import { CreditorConflictsService } from './creditor-conflicts.service';
import { ConflictResponseDto, ResolveConflictDto } from './dto';

/**
 * Creditor Conflicts Controller
 *
 * Public REST API for creditor conflict resolution workflow.
 * Powers the CreditorResolver UI (manual review queue).
 *
 * **Human-in-the-Loop Workflow:**
 * 1. Import creates conflicts for 40%+ confidence matches
 * 2. Admin reviews conflicts in UI (Green Strip / Amber / Red zones)
 * 3. Admin approves merge OR creates new creditor
 * 4. System reassigns debts and updates creditor records
 *
 * **Permissions:**
 * - DEBTS_READ: View conflict queue
 * - DEBTS_WRITE: Resolve conflicts (merge/create-new/dismiss)
 *
 * **Use Cases:**
 * - Admin reviews "Green Strip" (95%+ confidence) for bulk approval
 * - Manager investigates "Amber Zone" (70-94%) individual cases
 * - Admin confirms "Red Zone" (40-69%) new creditor creation
 * - Supervisor dismisses conflicts for later review
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@ApiTags('Creditor Conflicts')
@ApiBearerAuth()
@Controller('debts/creditor-conflicts/orgs/:organizationId')
@UseGuards(JwtAuthGuard, OrgContextGuard, PermissionsGuard)
export class CreditorConflictsController {
  constructor(
    private readonly conflictsService: CreditorConflictsService,
  ) {}

  @Get()
  @Permissions(OrganizationPermission.DEBTS_READ)
  @ApiOperation({ summary: 'List conflicts in manual review queue' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: CreditorConflictStatus,
    description: 'Filter by conflict status (defaults to unresolved only)',
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
    description: 'List of conflicts, sorted by impact (debt count descending)',
    type: [ConflictResponseDto],
  })
  async findPending(
    @OrganizationId() organizationId: string,
    @Query('status') status?: CreditorConflictStatus,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(50), ParseIntPipe) limit?: number,
  ): Promise<{ conflicts: ConflictResponseDto[]; total: number }> {
    // Enforce max limit
    const safeLimit = Math.min(limit || 50, 100);

    // Default to unresolved conflicts if no status specified
    const filterStatus = status || CreditorConflictStatus.HIGH_CONFIDENCE;

    const { conflicts, total } = await this.conflictsService.findAll(
      organizationId,
      {
        status: filterStatus,
        page,
        limit: safeLimit,
      },
    );

    return {
      conflicts: conflicts.map((c) => ConflictResponseDto.fromEntity(c)),
      total,
    };
  }

  @Get(':id')
  @Permissions(OrganizationPermission.DEBTS_READ)
  @ApiOperation({ summary: 'Get conflict details with suggested masters' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Conflict details with populated creditor suggestions',
    type: ConflictResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  async findOne(
    @OrganizationId() organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ConflictResponseDto> {
    const conflict = await this.conflictsService.findById(organizationId, id);
    return ConflictResponseDto.fromEntity(conflict);
  }

  @Post(':id/resolve')
  @Permissions(OrganizationPermission.DEBTS_WRITE)
  @ApiOperation({
    summary: 'Resolve conflict (merge/create-new/dismiss)',
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({
    status: 200,
    description: 'Conflict resolved successfully',
  })
  @ApiResponse({ status: 404, description: 'Conflict not found' })
  @ApiResponse({ status: 400, description: 'Invalid resolution action' })
  async resolve(
    @OrganizationId() organizationId: string,
    @CurrentUserId() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveConflictDto,
  ): Promise<{ message: string; conflictId: string }> {
    await this.conflictsService.resolve(
      organizationId,
      userId,
      id,
      dto.action,
      dto.targetMasterId,
      dto.targetGlobalId,
      dto.notes,
    );

    return {
      message: `Conflict resolved via ${dto.action}`,
      conflictId: id,
    };
  }
}

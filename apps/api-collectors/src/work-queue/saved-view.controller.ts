import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { SavedViewService } from './services/saved-view.service';
import {
  CreateSavedViewDto,
  UpdateSavedViewDto,
  SavedViewResponseDto,
  GetSavedViewsQueryDto,
  SetDefaultViewDto,
} from './dto';
import { JwtAuthGuard, CurrentUserId } from '@verichron/auth';

/**
 * Saved View Controller
 *
 * Endpoints for managing saved work queue filter views:
 * - Create custom filter sets
 * - Share views with team
 * - Set default views
 * - Manage quick filters
 */
@ApiTags('Work Queue - Saved Views')
@Controller('collectors/work-queue/saved-views/orgs/:organizationId')
export class SavedViewController {
  constructor(private readonly savedViewService: SavedViewService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get saved views',
    description: `
      Fetches saved views for the current user.

      Returns:
      - User's own saved views
      - Shared team views (if includeShared=true)
      - System quick filters

      Views are ordered by:
      1. Default view first
      2. Alphabetically by name

      Use Cases:
      - Populate saved views dropdown
      - Load user's default view on page load
      - Display quick filter options

      Permissions:
      - All authenticated users can view their own views + shared views
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved views retrieved successfully',
    type: [SavedViewResponseDto],
  })
  async getSavedViews(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Query() query: GetSavedViewsQueryDto,
  ): Promise<SavedViewResponseDto[]> {
    return this.savedViewService.getSavedViews(userId, orgId, query);
  }

  @Get('default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get default view',
    description: `
      Returns the user's default saved view.

      Use Cases:
      - Auto-load filters when user opens work queue
      - Restore user's preferred view
      - Quick access to most-used filter set

      Returns null if no default view is set.

      Permissions:
      - User can only get their own default view
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Default view retrieved successfully. Returns null if no default view is set.',
    type: SavedViewResponseDto,
  })
  async getDefaultView(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
  ): Promise<SavedViewResponseDto | null> {
    return this.savedViewService.getDefaultView(userId, orgId);
  }

  @Get(':viewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get saved view by ID',
    description: `
      Fetches a specific saved view by ID.

      Authorization:
      - Must be the view owner, OR
      - View must be shared, OR
      - View must be a system view

      Use Cases:
      - Load specific view details
      - Apply saved filters to work queue
      - Share view URL with team members

      Permissions:
      - View owner, OR shared/system views
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'viewId', type: 'string', format: 'uuid', description: 'The saved view ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved view retrieved successfully',
    type: SavedViewResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Saved view not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - private view',
  })
  async getSavedView(
    @Param('organizationId') orgId: string,
    @Param('viewId', ParseUUIDPipe) viewId: string,
    @CurrentUserId() userId: string,
  ): Promise<SavedViewResponseDto> {
    return this.savedViewService.getSavedView(viewId, userId, orgId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create saved view',
    description: `
      Creates a new saved view with custom filters.

      Features:
      - Save any combination of filters
      - Set as default view (auto-loads on page open)
      - Share with team (isShared: true)
      - Include sort configuration

      Use Cases:
      - Save frequently-used filter combinations
      - Create team-wide quick filters
      - Define personal default view

      Examples:
      - "My High Priority": minBalance: 5000, priorityLabels: ['HIGH']
      - "Overdue > 90 Days": minDaysOverdue: 90
      - "New Accounts": status: ['NEW'], sort by createdAt DESC

      Permissions:
      - All authenticated users can create views
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 201,
    description: 'Saved view created successfully',
    type: SavedViewResponseDto,
  })
  async createSavedView(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: CreateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.savedViewService.createSavedView(dto, userId, orgId);
  }

  @Patch(':viewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update saved view',
    description: `
      Updates an existing saved view.

      Updatable Fields:
      - name: Rename the view
      - description: Update description
      - filters: Modify filter criteria
      - isShared: Toggle team sharing
      - isDefault: Set/unset as default
      - sort: Update sort configuration

      Restrictions:
      - Only view owner can update
      - System views cannot be modified

      Use Cases:
      - Refine filter criteria
      - Share previously private view
      - Update view name/description

      Permissions:
      - View owner only
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'viewId', type: 'string', format: 'uuid', description: 'The saved view ID' })
  @ApiResponse({
    status: 200,
    description: 'Saved view updated successfully',
    type: SavedViewResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Saved view not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to update this view',
  })
  async updateSavedView(
    @Param('organizationId') orgId: string,
    @Param('viewId', ParseUUIDPipe) viewId: string,
    @CurrentUserId() userId: string,
    @Body() dto: UpdateSavedViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.savedViewService.updateSavedView(viewId, dto, userId, orgId);
  }

  @Delete(':viewId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Delete saved view',
    description: `
      Deletes a saved view.

      Restrictions:
      - Only view owner can delete
      - System views cannot be deleted

      Use Cases:
      - Remove unused views
      - Clean up old filter sets
      - Delete incorrect views

      Permissions:
      - View owner only
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'viewId', type: 'string', format: 'uuid', description: 'The saved view ID' })
  @ApiResponse({
    status: 204,
    description: 'Saved view deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Saved view not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Not authorized to delete this view',
  })
  async deleteSavedView(
    @Param('organizationId') orgId: string,
    @Param('viewId', ParseUUIDPipe) viewId: string,
    @CurrentUserId() userId: string,
  ): Promise<void> {
    await this.savedViewService.deleteSavedView(viewId, userId, orgId);
  }

  @Patch('set-default')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set default view',
    description: `
      Sets a specific view as the user's default.

      Behavior:
      - Clears any existing default
      - Sets specified view as new default
      - User can set any view they have access to as default
        (own views, shared views, or system views)

      Use Cases:
      - Set most-used view as default
      - Auto-load specific filters on login
      - Personalize work queue experience

      Permissions:
      - User must have access to the view (own, shared, or system)
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Default view set successfully',
    type: SavedViewResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Saved view not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Access denied - cannot set as default',
  })
  async setDefaultView(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Body() dto: SetDefaultViewDto,
  ): Promise<SavedViewResponseDto> {
    return this.savedViewService.setDefaultView(dto.viewId, userId, orgId);
  }
}

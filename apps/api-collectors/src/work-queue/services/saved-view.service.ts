import { Injectable, Logger, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedView } from '../entities';
import {
  CreateSavedViewDto,
  UpdateSavedViewDto,
  SavedViewResponseDto,
  GetSavedViewsQueryDto,
} from '../dto';

/**
 * Saved View Service
 *
 * Handles saved view management for work queue filters:
 * - Creating custom filter views
 * - Sharing views with team
 * - Setting default views
 * - Quick filter templates
 */
@Injectable()
export class SavedViewService {
  private readonly logger = new Logger(SavedViewService.name);

  constructor(
    @InjectRepository(SavedView)
    private readonly savedViewRepository: Repository<SavedView>,
  ) {}

  /**
   * Create a new saved view
   *
   * @param dto - View creation data
   * @param userId - User ID creating the view
   * @param organizationId - Organization ID for scoping
   * @returns Created saved view
   */
  async createSavedView(
    dto: CreateSavedViewDto,
    userId: string,
    organizationId: string,
  ): Promise<SavedViewResponseDto> {
    this.logger.log(`Creating saved view "${dto.name}" for user ${userId}`);

    // If setting as default, clear other defaults first
    if (dto.isDefault) {
      await this.clearUserDefaults(userId, organizationId);
    }

    const savedView = this.savedViewRepository.create({
      organizationId,
      userId,
      name: dto.name,
      description: dto.description || null,
      filters: dto.filters,
      isShared: dto.isShared || false,
      isSystem: false,
      isDefault: dto.isDefault || false,
      sort: dto.sort || null,
    });

    const saved = await this.savedViewRepository.save(savedView);

    this.logger.log(`Created saved view ${saved.id} for user ${userId}`);

    return this.mapToResponseDto(saved);
  }

  /**
   * Get all saved views for a user
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for scoping
   * @param query - Query filters
   * @returns List of saved views
   */
  async getSavedViews(
    userId: string,
    organizationId: string,
    query: GetSavedViewsQueryDto,
  ): Promise<SavedViewResponseDto[]> {
    this.logger.log(`Fetching saved views for user ${userId}`);

    const queryBuilder = this.savedViewRepository
      .createQueryBuilder('view')
      .where('view.organization_id = :organizationId', { organizationId });

    if (query.onlySystem) {
      // Only system views
      queryBuilder.andWhere('view.is_system = true');
    } else if (query.includeShared) {
      // User's own views + shared views + system views
      queryBuilder.andWhere(
        '(view.user_id = :userId OR view.is_shared = true OR view.is_system = true)',
        { userId },
      );
    } else {
      // Only user's own views + system views
      queryBuilder.andWhere(
        '(view.user_id = :userId OR view.is_system = true)',
        { userId },
      );
    }

    queryBuilder.orderBy('view.is_default', 'DESC');
    queryBuilder.addOrderBy('view.name', 'ASC');

    const views = await queryBuilder.getMany();

    this.logger.log(`Fetched ${views.length} saved views for user ${userId}`);

    return views.map(v => this.mapToResponseDto(v));
  }

  /**
   * Get a specific saved view by ID
   *
   * @param viewId - View ID
   * @param userId - User ID (for authorization)
   * @param organizationId - Organization ID for scoping
   * @returns Saved view
   */
  async getSavedView(
    viewId: string,
    userId: string,
    organizationId: string,
  ): Promise<SavedViewResponseDto> {
    this.logger.log(`Fetching saved view ${viewId}`);

    const view = await this.savedViewRepository.findOne({
      where: {
        id: viewId,
        organizationId,
      },
    });

    if (!view) {
      throw new NotFoundException(`Saved view ${viewId} not found`);
    }

    // Check authorization: must be owner, or view must be shared/system
    if (view.userId !== userId && !view.isShared && !view.isSystem) {
      throw new ForbiddenException('You do not have access to this saved view');
    }

    return this.mapToResponseDto(view);
  }

  /**
   * Update an existing saved view
   *
   * @param viewId - View ID
   * @param dto - Update data
   * @param userId - User ID (for authorization)
   * @param organizationId - Organization ID for scoping
   * @returns Updated saved view
   */
  async updateSavedView(
    viewId: string,
    dto: UpdateSavedViewDto,
    userId: string,
    organizationId: string,
  ): Promise<SavedViewResponseDto> {
    this.logger.log(`Updating saved view ${viewId}`);

    const view = await this.savedViewRepository.findOne({
      where: {
        id: viewId,
        organizationId,
      },
    });

    if (!view) {
      throw new NotFoundException(`Saved view ${viewId} not found`);
    }

    // Only owner can update (unless admin - would need role check)
    if (view.userId !== userId) {
      throw new ForbiddenException('You can only update your own saved views');
    }

    // System views cannot be edited
    if (view.isSystem) {
      throw new ForbiddenException('System views cannot be modified');
    }

    // If setting as default, clear other defaults first
    if (dto.isDefault && !view.isDefault) {
      await this.clearUserDefaults(userId, organizationId);
    }

    // Update fields
    if (dto.name !== undefined) {
      view.name = dto.name;
    }
    if (dto.description !== undefined) {
      view.description = dto.description || null;
    }
    if (dto.filters !== undefined) {
      view.filters = dto.filters;
    }
    if (dto.isShared !== undefined) {
      view.isShared = dto.isShared;
    }
    if (dto.isDefault !== undefined) {
      view.isDefault = dto.isDefault;
    }
    if (dto.sort !== undefined) {
      view.sort = dto.sort || null;
    }

    const updated = await this.savedViewRepository.save(view);

    this.logger.log(`Updated saved view ${viewId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Delete a saved view
   *
   * @param viewId - View ID
   * @param userId - User ID (for authorization)
   * @param organizationId - Organization ID for scoping
   */
  async deleteSavedView(
    viewId: string,
    userId: string,
    organizationId: string,
  ): Promise<void> {
    this.logger.log(`Deleting saved view ${viewId}`);

    const view = await this.savedViewRepository.findOne({
      where: {
        id: viewId,
        organizationId,
      },
    });

    if (!view) {
      throw new NotFoundException(`Saved view ${viewId} not found`);
    }

    // Only owner can delete (unless admin - would need role check)
    if (view.userId !== userId) {
      throw new ForbiddenException('You can only delete your own saved views');
    }

    // System views cannot be deleted
    if (view.isSystem) {
      throw new ForbiddenException('System views cannot be deleted');
    }

    await this.savedViewRepository.remove(view);

    this.logger.log(`Deleted saved view ${viewId}`);
  }

  /**
   * Set a view as the default for a user
   *
   * @param viewId - View ID to set as default
   * @param userId - User ID
   * @param organizationId - Organization ID for scoping
   * @returns Updated view
   */
  async setDefaultView(
    viewId: string,
    userId: string,
    organizationId: string,
  ): Promise<SavedViewResponseDto> {
    this.logger.log(`Setting view ${viewId} as default for user ${userId}`);

    const view = await this.savedViewRepository.findOne({
      where: {
        id: viewId,
        organizationId,
      },
    });

    if (!view) {
      throw new NotFoundException(`Saved view ${viewId} not found`);
    }

    // Check authorization: must be owner, or view must be shared/system
    if (view.userId !== userId && !view.isShared && !view.isSystem) {
      throw new ForbiddenException('You do not have access to this saved view');
    }

    // Clear other defaults
    await this.clearUserDefaults(userId, organizationId);

    // Set this one as default
    view.isDefault = true;
    const updated = await this.savedViewRepository.save(view);

    this.logger.log(`Set view ${viewId} as default for user ${userId}`);

    return this.mapToResponseDto(updated);
  }

  /**
   * Get the default view for a user
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for scoping
   * @returns Default view or null
   */
  async getDefaultView(
    userId: string,
    organizationId: string,
  ): Promise<SavedViewResponseDto | null> {
    this.logger.log(`Fetching default view for user ${userId}`);

    const view = await this.savedViewRepository.findOne({
      where: {
        organizationId,
        userId,
        isDefault: true,
      },
    });

    if (!view) {
      this.logger.log(`No default view found for user ${userId}`);
      return null;
    }

    return this.mapToResponseDto(view);
  }

  /**
   * Clear all default views for a user
   * (Helper method used when setting a new default)
   */
  private async clearUserDefaults(
    userId: string,
    organizationId: string,
  ): Promise<void> {
    await this.savedViewRepository.update(
      {
        organizationId,
        userId,
        isDefault: true,
      },
      {
        isDefault: false,
      },
    );
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToResponseDto(view: SavedView): SavedViewResponseDto {
    return {
      id: view.id,
      organizationId: view.organizationId,
      userId: view.userId,
      name: view.name,
      description: view.description || undefined,
      filters: view.filters,
      isShared: view.isShared,
      isSystem: view.isSystem,
      isDefault: view.isDefault,
      sort: view.sort || undefined,
      createdAt: view.createdAt.toISOString(),
      updatedAt: view.updatedAt.toISOString(),
    };
  }
}

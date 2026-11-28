import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreditorConflict } from './entities/creditor-conflict.entity';
import { Creditor } from './entities/creditor.entity';
import { GlobalCreditor } from './entities/global-creditor.entity';
import { CreditorsService } from './creditors.service';
import {
  CreditorConflictStatus,
  ConflictResolutionAction,
} from '@verichron/enums';

/**
 * Creditor Conflicts Service
 *
 * Manages the manual review queue for creditor entity resolution conflicts.
 * Powers the CreditorResolver UI workflow.
 *
 * **Human-in-the-Loop Workflow:**
 * 1. Conflicts created during debt import when AI finds 40%+ matches
 * 2. Admin reviews conflicts sorted by impact (debt count descending)
 * 3. Admin takes action: MERGE, CREATE_NEW, or DISMISS
 * 4. System updates creditor records and reassigns debts if needed
 *
 * **Conflict Status Lifecycle:**
 * - HIGH_CONFIDENCE → RESOLVED (via merge/create-new)
 * - MEDIUM_CONFIDENCE → RESOLVED (via merge/create-new)
 * - LOW_CONFIDENCE → RESOLVED (via merge/create-new)
 * - Any → DISMISSED (deferred decision)
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@Injectable()
export class CreditorConflictsService {
  private readonly logger = new Logger(CreditorConflictsService.name);

  constructor(
    @InjectRepository(CreditorConflict)
    private readonly conflictRepository: Repository<CreditorConflict>,
    @InjectRepository(Creditor)
    private readonly creditorRepository: Repository<Creditor>,
    @InjectRepository(GlobalCreditor)
    private readonly globalCreditorRepository: Repository<GlobalCreditor>,
    private readonly creditorsService: CreditorsService,
  ) {}

  /**
   * List all conflicts with pagination and filtering.
   *
   * **Sorting:** Impact-based (debtCount DESC, then confidence DESC)
   * This ensures high-impact conflicts are resolved first.
   */
  async findAll(
    organizationId: string,
    options: {
      status?: CreditorConflictStatus;
      page?: number;
      limit?: number;
    },
  ): Promise<{ conflicts: CreditorConflict[]; total: number }> {
    const query = this.conflictRepository.createQueryBuilder('conflict');

    query.where('conflict.organization_id = :organizationId', {
      organizationId,
    });

    if (options.status) {
      query.andWhere('conflict.status = :status', { status: options.status });
    } else {
      // Default: Show all unresolved conflicts
      query.andWhere('conflict.status IN (:...statuses)', {
        statuses: [
          CreditorConflictStatus.HIGH_CONFIDENCE,
          CreditorConflictStatus.MEDIUM_CONFIDENCE,
          CreditorConflictStatus.LOW_CONFIDENCE,
        ],
      });
    }

    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    query.skip((page - 1) * limit).take(limit);

    // Impact-based sorting
    query.orderBy('conflict.debt_count', 'DESC');
    query.addOrderBy('conflict.created_at', 'DESC');

    const [conflicts, total] = await query.getManyAndCount();

    return { conflicts, total };
  }

  /**
   * Find conflict by ID.
   */
  async findById(
    organizationId: string,
    id: string,
  ): Promise<CreditorConflict> {
    const conflict = await this.conflictRepository.findOne({
      where: { id, organizationId },
    });

    if (!conflict) {
      throw new NotFoundException(`Conflict with ID ${id} not found`);
    }

    return conflict;
  }

  /**
   * Resolve conflict via user action.
   *
   * **Actions:**
   * - MERGE: Link temp creditor to suggested master, reassign debts
   * - CREATE_NEW: Convert temp creditor to permanent, mark conflict resolved
   * - DISMISS: Mark conflict as dismissed for later review
   */
  async resolve(
    organizationId: string,
    userId: string,
    conflictId: string,
    action: ConflictResolutionAction,
    targetMasterId?: string,
    targetGlobalId?: string,
    notes?: string,
  ): Promise<void> {
    const conflict = await this.findById(organizationId, conflictId);

    // Validation: Cannot resolve already-resolved conflict
    if (conflict.status === CreditorConflictStatus.RESOLVED) {
      throw new BadRequestException('Conflict is already resolved');
    }

    // Handle each action type
    switch (action) {
      case ConflictResolutionAction.MERGE:
        await this.handleMerge(
          organizationId,
          conflict,
          userId,
          targetMasterId!,
          targetGlobalId,
          notes,
        );
        break;

      case ConflictResolutionAction.CREATE_NEW:
        await this.handleCreateNew(organizationId, conflict, userId, notes);
        break;

      case ConflictResolutionAction.DISMISS:
        await this.handleDismiss(conflict, userId, notes);
        break;

      default:
        throw new BadRequestException(`Invalid action: ${action}`);
    }

    this.logger.log(
      `Conflict ${conflictId} resolved via ${action} by user ${userId}`,
    );
  }

  /**
   * Handle MERGE action.
   *
   * **Process:**
   * 1. Find temp creditor associated with conflict
   * 2. Merge temp creditor into target master (reassigns debts)
   * 3. Link to global creditor if targetGlobalId provided
   * 4. Mark conflict as RESOLVED
   */
  private async handleMerge(
    organizationId: string,
    conflict: CreditorConflict,
    userId: string,
    targetMasterId: string,
    targetGlobalId: string | undefined,
    notes: string | undefined,
  ): Promise<void> {
    // Find temp creditor (created during import)
    const tempCreditor = await this.findTempCreditorForConflict(
      organizationId,
      conflict,
    );

    // Merge temp into master (reassigns all debts)
    await this.creditorsService.merge(
      organizationId,
      userId,
      tempCreditor.id,
      targetMasterId,
      notes,
    );

    // Link to global creditor if provided
    if (targetGlobalId) {
      const master = await this.creditorsService.findById(
        organizationId,
        targetMasterId,
      );
      master.globalCreditorId = targetGlobalId;
      master.isPlatformVerified = true;
      master.globalLinkConfidence = conflict.confidenceScores[0];
      await this.creditorRepository.save(master);

      this.logger.log(
        `Linked creditor ${targetMasterId} to global creditor ${targetGlobalId}`,
      );
    }

    // Update conflict record
    conflict.status = CreditorConflictStatus.RESOLVED;
    conflict.resolvedByUserId = userId;
    conflict.resolvedAt = new Date();
    conflict.resolution = {
      action: ConflictResolutionAction.MERGE,
      targetMasterId,
      targetGlobalId,
      notes,
    };

    await this.conflictRepository.save(conflict);
  }

  /**
   * Handle CREATE_NEW action.
   *
   * **Process:**
   * 1. Find temp creditor associated with conflict
   * 2. Mark creditor as permanent (clear hasUnresolvedConflict flag)
   * 3. Mark conflict as RESOLVED
   */
  private async handleCreateNew(
    organizationId: string,
    conflict: CreditorConflict,
    userId: string,
    notes: string | undefined,
  ): Promise<void> {
    // Find temp creditor
    const tempCreditor = await this.findTempCreditorForConflict(
      organizationId,
      conflict,
    );

    // Convert temp to permanent
    tempCreditor.hasUnresolvedConflict = false;
    tempCreditor.hygieneScore = (tempCreditor.hygieneScore || 0) + 30; // +30 for resolving conflict
    await this.creditorRepository.save(tempCreditor);

    this.logger.log(
      `Converted temp creditor ${tempCreditor.id} to permanent via CREATE_NEW`,
    );

    // Update conflict record
    conflict.status = CreditorConflictStatus.RESOLVED;
    conflict.resolvedByUserId = userId;
    conflict.resolvedAt = new Date();
    conflict.resolution = {
      action: ConflictResolutionAction.CREATE_NEW,
      notes,
    };

    await this.conflictRepository.save(conflict);
  }

  /**
   * Handle DISMISS action.
   *
   * **Process:**
   * 1. Mark conflict as DISMISSED (removes from active queue)
   * 2. Note: Temp creditor remains UNVERIFIED.
   */
  private async handleDismiss(
    conflict: CreditorConflict,
    userId: string,
    notes: string | undefined,
  ): Promise<void> {
    conflict.status = CreditorConflictStatus.DISMISSED;
    conflict.resolvedByUserId = userId;
    conflict.resolvedAt = new Date();
    conflict.resolution = {
      action: ConflictResolutionAction.DISMISS,
      notes,
    };

    await this.conflictRepository.save(conflict);
  }

  /**
   * Find the temporary creditor created during import for a specific conflict.
   *
   * Uses sourceImportId and normalizedName to find the exact temp record.
   */
  private async findTempCreditorForConflict(
    organizationId: string,
    conflict: CreditorConflict,
  ): Promise<Creditor> {
    const tempCreditor = await this.creditorRepository.findOne({
      where: {
        organizationId,
        normalizedName: conflict.normalizedName,
        hasUnresolvedConflict: true,
      },
      order: { createdAt: 'DESC' }, // Get most recent if multiple (edge case)
    });

    if (!tempCreditor) {
      this.logger.error(
        `Failed to find temp creditor for conflict ${conflict.id}`,
        {
          normalizedName: conflict.normalizedName,
          sourceImportId: conflict.sourceImportId,
        },
      );
      throw new NotFoundException(
        'Temporary creditor record not found. It may have been manually deleted.',
      );
    }

    return tempCreditor;
  }
}
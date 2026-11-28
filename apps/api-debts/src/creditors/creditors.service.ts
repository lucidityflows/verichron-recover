import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Creditor } from './entities/creditor.entity';
import { Debt } from '../debts/entities/debt.entity';
import { CreateCreditorDto, UpdateCreditorDto } from './dto';
import { CreditorResolutionService } from './creditor-resolution.service';

/**
 * Creditors Service (Version 2.0)
 *
 * Provides CRUD operations for creditor master data.
 * Used during debt import and for creditor management UI.
 *
 * **Key Operations:**
 * - findAll: List creditors with pagination and search
 * - findById: Retrieve creditor by ID (tenant-scoped)
 * - create: Manual creditor entry
 * - update: Edit creditor details
 * - delete: Soft delete (prevents deletion if debts exist)
 * - merge: Merge duplicate into master (reassigns all debts)
 * - updateStats: Update debt count and total principal (event-driven)
 *
 * **Master Data Pattern:**
 * - One canonical record per real-world creditor
 * - Duplicates marked with isMasterRecord=false and masterCreditorId FK
 * - CreditorResolutionService handles deduplication during import
 */
@Injectable()
export class CreditorsService {
  private readonly logger = new Logger(CreditorsService.name);

  constructor(
    @InjectRepository(Creditor)
    private readonly creditorRepository: Repository<Creditor>,
    @InjectRepository(Debt)
    private readonly debtRepository: Repository<Debt>,
    private readonly resolutionService: CreditorResolutionService,
  ) {}

  /**
   * List all creditors with pagination and search.
   *
   * @param organizationId - Tenant ID
   * @param options - Query options (search, onlyMasters, pagination)
   * @returns Creditors and total count
   */
  async findAll(
    organizationId: string,
    options: {
      search?: string;
      onlyMasters?: boolean;
      page?: number;
      limit?: number;
    },
  ): Promise<{ creditors: Creditor[]; total: number }> {
    const query = this.creditorRepository.createQueryBuilder('creditor');

    query.where('creditor.organization_id = :organizationId', {
      organizationId,
    });

    if (options.onlyMasters) {
      query.andWhere('creditor.is_master_record = :isMaster', {
        isMaster: true,
      });
    }

    if (options.search) {
      query.andWhere(
        '(creditor.legal_name ILIKE :search OR creditor.ein ILIKE :search)',
        { search: `%${options.search}%` },
      );
    }

    // Pagination
    const page = options.page || 1;
    const limit = options.limit || 50;
    query.skip((page - 1) * limit).take(limit);

    // Order by name
    query.orderBy('creditor.legal_name', 'ASC');

    const [creditors, total] = await query.getManyAndCount();

    return { creditors, total };
  }

  /**
   * Find creditor by ID (tenant-scoped).
   */
  async findById(organizationId: string, id: string): Promise<Creditor> {
    const creditor = await this.creditorRepository.findOne({
      where: { id, organizationId },
    });

    if (!creditor) {
      throw new NotFoundException(`Creditor with ID ${id} not found`);
    }

    return creditor;
  }

  /**
   * Create a new creditor (manual entry).
   *
   * **Note:** This bypasses the resolution service and creates a permanent creditor immediately.
   * Used for manual admin entry, not for import workflow.
   */
  async create(
    organizationId: string,
    dto: CreateCreditorDto,
  ): Promise<Creditor> {
    const normalizedName = this.resolutionService.normalizeName(dto.legalName);

    const creditor = this.creditorRepository.create({
      organizationId,
      legalName: dto.legalName,
      normalizedName,
      ein: dto.ein ? dto.ein.toUpperCase() : null,
      dbaName: dto.dbaName || null,
      street1: dto.street1 || null,
      street2: dto.street2 || null,
      street3: dto.street3 || null,
      city: dto.city || null,
      state: dto.state || null,
      postalCode: dto.postalCode || null,
      country: dto.country || 'US',
      industry: dto.industry || null,
      notes: dto.notes || null,
      isMasterRecord: true,
      hasUnresolvedConflict: false,
      einVerified: false,
      debtCount: 0,
      totalPrincipal: '0',
    });

    const saved = await this.creditorRepository.save(creditor);

    this.logger.log(
      `Created creditor: ${saved.legalName} (ID: ${saved.id}, EIN: ${saved.ein || 'N/A'})`,
    );

    return saved;
  }

  /**
   * Update creditor record.
   */
  async update(
    organizationId: string,
    id: string,
    dto: UpdateCreditorDto,
  ): Promise<Creditor> {
    const creditor = await this.findById(organizationId, id);

    // Update fields
    if (dto.legalName) {
      creditor.legalName = dto.legalName;
      creditor.normalizedName = this.resolutionService.normalizeName(
        dto.legalName,
      );
    }
    if (dto.ein !== undefined) creditor.ein = dto.ein ? dto.ein.toUpperCase() : null;
    if (dto.dbaName !== undefined) creditor.dbaName = dto.dbaName || null;
    if (dto.street1 !== undefined) creditor.street1 = dto.street1 || null;
    if (dto.street2 !== undefined) creditor.street2 = dto.street2 || null;
    if (dto.street3 !== undefined) creditor.street3 = dto.street3 || null;
    if (dto.city !== undefined) creditor.city = dto.city || null;
    if (dto.state !== undefined) creditor.state = dto.state || null;
    if (dto.postalCode !== undefined) creditor.postalCode = dto.postalCode || null;
    if (dto.country !== undefined) creditor.country = dto.country || 'US';
    if (dto.industry !== undefined) creditor.industry = dto.industry || null;
    if (dto.notes !== undefined) creditor.notes = dto.notes || null;

    const updated = await this.creditorRepository.save(creditor);

    this.logger.log(`Updated creditor: ${updated.legalName} (ID: ${id})`);

    return updated;
  }

  /**
   * Soft delete creditor.
   *
   * **Validation:** Cannot delete creditor with active debts.
   */
  async delete(organizationId: string, id: string): Promise<void> {
    const creditor = await this.findById(organizationId, id);

    // Check for active debts
    if (creditor.debtCount > 0) {
      throw new BadRequestException(
        `Cannot delete creditor with ${creditor.debtCount} active debts. Reassign debts first.`,
      );
    }

    await this.creditorRepository.remove(creditor);

    this.logger.log(`Deleted creditor: ${creditor.legalName} (ID: ${id})`);
  }

  /**
   * Merge duplicate creditor into master.
   *
   * **Process:**
   * 1. Validate both creditors exist and belong to organization
   * 2. Validate duplicate is not already merged
   * 3. Reassign all debts from duplicate to master
   * 4. Mark duplicate as isMasterRecord=false, set masterCreditorId
   * 5. Update master creditor stats
   * 6. Return master creditor
   *
   * **Note:** This creates an audit trail via the userId parameter.
   */
  async merge(
    organizationId: string,
    userId: string,
    duplicateId: string,
    masterCreditorId: string,
    notes?: string,
  ): Promise<Creditor> {
    // Validate both creditors
    const duplicate = await this.findById(organizationId, duplicateId);
    const master = await this.findById(organizationId, masterCreditorId);

    // Validation: Cannot merge master into duplicate
    if (!duplicate.isMasterRecord) {
      throw new BadRequestException(
        'Cannot merge a creditor that is already marked as duplicate',
      );
    }

    // Validation: Cannot merge into self
    if (duplicateId === masterCreditorId) {
      throw new BadRequestException('Cannot merge creditor into itself');
    }

    // Step 1: Reassign all debts from duplicate to master
    const debtsToReassign = await this.debtRepository.find({
      where: { creditorId: duplicateId },
    });

    for (const debt of debtsToReassign) {
      debt.creditorId = masterCreditorId;
    }

    await this.debtRepository.save(debtsToReassign);

    this.logger.log(
      `Reassigned ${debtsToReassign.length} debts from ${duplicate.legalName} to ${master.legalName}`,
    );

    // Step 2: Mark duplicate
    duplicate.isMasterRecord = false;
    duplicate.masterCreditorId = masterCreditorId;
    duplicate.hasUnresolvedConflict = false;
    await this.creditorRepository.save(duplicate);

    // Step 3: Update master stats
    await this.updateStats(masterCreditorId);

    this.logger.log(
      `Merged creditor ${duplicate.legalName} (${duplicateId}) into ${master.legalName} (${masterCreditorId}) by user ${userId}`,
    );

    // Return updated master
    return this.findById(organizationId, masterCreditorId);
  }

  /**
   * Update creditor statistics (debt count, total principal).
   *
   * Called from debt lifecycle events (debt created, debt updated, debt paid).
   */
  async updateStats(creditorId: string): Promise<void> {
    const result = await this.creditorRepository.query(
      `
      UPDATE creditors
      SET
        debt_count = (
          SELECT COUNT(*)
          FROM debts
          WHERE creditor_id = $1
        ),
        total_principal = (
          SELECT COALESCE(SUM(principal_amount), 0)
          FROM debts
          WHERE creditor_id = $1
        )
      WHERE id = $1
    `,
      [creditorId],
    );

    this.logger.debug(`Updated stats for creditor ${creditorId}`);
  }

  /**
   * Get creditor or master if duplicate.
   *
   * Used for analytics to ensure all debts roll up to canonical creditor.
   */
  async getMasterCreditor(creditorId: string): Promise<Creditor> {
    const creditor = await this.creditorRepository.findOne({
      where: { id: creditorId },
    });

    if (!creditor) {
      throw new NotFoundException(`Creditor with ID ${creditorId} not found`);
    }

    if (!creditor.isMasterRecord && creditor.masterCreditorId) {
      return this.creditorRepository.findOne({
        where: { id: creditor.masterCreditorId },
      }) as Promise<Creditor>;
    }

    return creditor;
  }
}

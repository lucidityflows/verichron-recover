import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GlobalCreditor } from './entities/global-creditor.entity';
import { Creditor } from './entities/creditor.entity';
import { CreateGlobalCreditorDto, UpdateGlobalCreditorDto } from './dto/ops';

/**
 * Creditors Ops Service
 *
 * Handles management of the Platform Master Creditor List (Gold List)
 * and provides read-only visibility into tenant-scoped creditors.
 *
 * Compliance Note: Management of tenant-scoped creditors is strictly reserved
 * for tenant admins. Platform admins only have read-only access for support.
 */
@Injectable()
export class CreditorsOpsService {
  private readonly logger = new Logger(CreditorsOpsService.name);

  constructor(
    @InjectRepository(GlobalCreditor)
    private readonly globalCreditorRepo: Repository<GlobalCreditor>,
    @InjectRepository(Creditor)
    private readonly tenantCreditorRepo: Repository<Creditor>,
  ) {}

  // ==========================================================================
  // GLOBAL CREDITOR MANAGEMENT (CRUD)
  // ==========================================================================

  async findAllGlobal(): Promise<GlobalCreditor[]> {
    return this.globalCreditorRepo.find({
      order: { canonicalName: 'ASC' },
    });
  }

  async findOneGlobal(id: string): Promise<GlobalCreditor> {
    const creditor = await this.globalCreditorRepo.findOneBy({ id });
    if (!creditor) {
      throw new NotFoundException(`Global creditor ${id} not found`);
    }
    return creditor;
  }

  async createGlobal(dto: CreateGlobalCreditorDto, adminId: string): Promise<GlobalCreditor> {
    this.logger.log(`[Ops] Creating global creditor: ${dto.canonicalName} by admin: ${adminId}`);
    const creditor = this.globalCreditorRepo.create({
      ...dto,
      createdByPlatformUserId: adminId,
    });
    return this.globalCreditorRepo.save(creditor);
  }

  async updateGlobal(id: string, dto: UpdateGlobalCreditorDto, adminId: string): Promise<GlobalCreditor> {
    this.logger.log(`[Ops] Updating global creditor ${id} by admin: ${adminId}`);
    const creditor = await this.findOneGlobal(id);
    Object.assign(creditor, dto);
    return this.globalCreditorRepo.save(creditor);
  }

  async deleteGlobal(id: string, adminId: string): Promise<void> {
    this.logger.warn(`[Ops] Deleting global creditor ${id} by admin: ${adminId}`);
    const result = await this.globalCreditorRepo.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`Global creditor ${id} not found`);
    }
  }

  // ==========================================================================
  // TENANT CREDITOR VISIBILITY (READ-ONLY)
  // ==========================================================================

  async findAllTenantCreditors(query: {
    organizationId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ data: Creditor[]; total: number }> {
    const { organizationId, search, page = 1, pageSize = 20 } = query;
    const qb = this.tenantCreditorRepo.createQueryBuilder('c');

    if (organizationId) {
      qb.andWhere('c.organization_id = :organizationId', { organizationId });
    }

    if (search) {
      qb.andWhere('(c.legal_name ILIKE :search OR c.ein ILIKE :search)', { search: `%${search}%` });
    }

    const [data, total] = await qb
      .orderBy('c.createdAt', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return { data, total };
  }
}

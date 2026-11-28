import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { SettlementAuthorityMatrix } from './entities/settlement-authority-matrix.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';
import { UpdateSettlementStrategyDto, UpdateApprovalLadderDto } from './dto/strategy.dto';

@Injectable()
export class StrategyService {
  private readonly logger = new Logger(StrategyService.name);

  constructor(
    @InjectRepository(SettlementAuthorityMatrix)
    private readonly matrixRepo: Repository<SettlementAuthorityMatrix>,
    @InjectRepository(ApprovalThreshold)
    private readonly thresholdRepo: Repository<ApprovalThreshold>,
    private readonly dataSource: DataSource,
  ) {}

  async getSettlementMatrix(organizationId: string): Promise<SettlementAuthorityMatrix[]> {
    return this.matrixRepo.find({
      where: { organizationId },
      order: { minBalance: 'ASC', minAgeDays: 'ASC' },
    });
  }

  async getApprovalLadder(organizationId: string): Promise<ApprovalThreshold[]> {
    return this.thresholdRepo.find({
      where: { organizationId },
      order: { maxDiscountPercent: 'ASC' },
    });
  }

  async updateSettlementMatrix(
    organizationId: string,
    userId: string,
    dto: UpdateSettlementStrategyDto,
  ): Promise<SettlementAuthorityMatrix[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Snapshot previous state for audit
      const previousState = await this.getSettlementMatrix(organizationId);

      // 2. Delete existing matrix for this org
      await queryRunner.manager.delete(SettlementAuthorityMatrix, { organizationId });

      // 3. Insert new rows
      const newRows = dto.matrix.map((row) => ({
        ...row,
        organizationId,
      }));
      const savedRows = await queryRunner.manager.save(SettlementAuthorityMatrix, newRows);

      // TODO: Emit an Audit Event to api-audits (via @dls/event-publisher)
      // to record the change from previousState to savedRows.

      await queryRunner.commitTransaction();
      return savedRows;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      const error = err as Error;
      this.logger.error(`Failed to update settlement matrix: ${error.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updateApprovalLadder(
    organizationId: string,
    userId: string,
    dto: UpdateApprovalLadderDto,
  ): Promise<ApprovalThreshold[]> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const previousState = await this.getApprovalLadder(organizationId);

      // Upsert pattern for thresholds
      for (const thresholdDto of dto.thresholds) {
        let threshold = await queryRunner.manager.findOne(ApprovalThreshold, {
          where: { organizationId, roleType: thresholdDto.roleType },
        });

        if (threshold) {
          queryRunner.manager.merge(ApprovalThreshold, threshold, thresholdDto);
        } else {
          threshold = queryRunner.manager.create(ApprovalThreshold, {
            ...thresholdDto,
            organizationId,
          });
        }
        await queryRunner.manager.save(ApprovalThreshold, threshold);
      }

      const newState = await this.getApprovalLadder(organizationId);

      // TODO: Emit an Audit Event to api-audits (via @dls/event-publisher)
      // to record the change from previousState to newState.

      await queryRunner.commitTransaction();
      return newState;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      const error = err as Error;
      this.logger.error(`Failed to update approval ladder: ${error.message}`);
      throw err;
    } finally {
      await queryRunner.release();
    }
  }
}
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StrategyController } from './strategy.controller';
import { StrategyService } from './strategy.service';
import { SettlementAuthorityMatrix } from './entities/settlement-authority-matrix.entity';
import { ApprovalThreshold } from './entities/approval-threshold.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SettlementAuthorityMatrix,
      ApprovalThreshold,
    ]),
  ],
  controllers: [StrategyController],
  providers: [StrategyService],
  exports: [StrategyService],
})
export class StrategyModule {}
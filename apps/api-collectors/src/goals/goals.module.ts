import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GoalsService } from './goals.service';
import { GoalsController } from './goals.controller';
import { Goal, GoalProgress } from './entities';
import { CoreModule } from '../core/core.module';
import { TransactionSucceededListener } from './listeners/transaction-succeeded.listener';
import { DebtorActionLoggedListener } from './listeners/debtor-action-logged.listener';

@Module({
  imports: [
    TypeOrmModule.forFeature([Goal, GoalProgress]),
    CoreModule,
  ],
  controllers: [GoalsController],
  providers: [
    GoalsService,
    TransactionSucceededListener,
    DebtorActionLoggedListener,
  ],
  exports: [GoalsService],
})
export class GoalsModule {}

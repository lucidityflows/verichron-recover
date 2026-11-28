import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DebtsController } from './debts.controller';
import { DebtsService } from './debts.service';
import { Debt } from './entities/debt.entity';
import { DebtDebtor } from './entities/debt-debtor.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { DebtIndexService } from './redis-read-model/debt-index.service';
import {
  DebtorUserLinkedListener,
  DebtCreatedListener,
  DebtorImportBatchCompletedListener,
  DebtStatusQueryListener,
} from './listeners';

/**
 * Debts Feature Module
 *
 * Encapsulates all debt management functionality including:
 * - Debt CRUD operations
 * - Status lifecycle management
 * - Layer 2 authorization (portfolio access)
 * - Many-to-many debtor associations
 * - Event publishing for debt lifecycle changes
 * - Redis read model for fast debtor-to-debt queries (CQRS pattern)
 *
 * Entities:
 * - Debt: Individual debt account records
 * - DebtDebtor: Join table for debt-debtor many-to-many relationship
 *
 * Redis Read Model:
 * - DebtIndexService: Maintains Redis indexes for debtor queries
 * - DebtorUserLinkedListener: Builds initial Redis index when debtor linked to user
 * - DebtCreatedListener: Updates Redis index when new debts are created
 *
 * Dependencies:
 * - TypeORM for database access
 * - RedisService for Redis read model (injected globally)
 * - EventSubscriber for event-driven architecture
 * - UserPortfolioPermission entity (from portfolios module) for Layer 2 auth
 *
 * Exports:
 * - DebtsService: Available for other modules (e.g., imports module, portfolios module)
 * - DebtIndexService: Available for testing and direct access if needed
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Debt,
      DebtDebtor,
      UserPortfolioPermission, // For Layer 2 authorization checks
    ]),
  ],
  controllers: [DebtsController],
  providers: [
    DebtsService,
    DebtIndexService,
    DebtorUserLinkedListener,
    DebtCreatedListener,
    DebtorImportBatchCompletedListener,
    DebtStatusQueryListener,
  ],
  exports: [
    DebtsService,
    DebtIndexService, // Export for testing
  ],
})
export class DebtsModule {}
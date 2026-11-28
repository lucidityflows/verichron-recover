import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HistoryController } from './debt-ownership-history.controller';
import { HistoryService } from './debt-ownership-history.service';
import { DebtOwnershipHistory } from './entities/debt-ownership-history.entity';
import { Debt } from '../debts/entities/debt.entity';
import { UserPortfolioPermission } from '../portfolios/entities/user-portfolio-permission.entity';
import { PortfolioSoldListener } from './listeners/portfolio-sold.listener';

/**
 * History Feature Module
 * 
 * Encapsulates all debt ownership history functionality including:
 * - Ownership chain of title tracking (append-only audit log)
 * - Query interface for ownership history
 * - Internal methods for creating/closing ownership records
 * - Data integrity verification
 * 
 * Key Characteristics:
 * - **Append-only**: Records are never deleted
 * - **Immutable**: Once created, records are not modified (except soldDate)
 * - **Legal compliance**: Provides defensible audit trail
 * - **Integration point**: Used by imports and portfolios modules
 * 
 * Entities:
 * - DebtOwnershipHistory: Immutable audit log of debt ownership periods
 * 
 * Dependencies:
 * - TypeORM for database access
 * - Debt entity (from debts module): For validation in queries
 * - PortfoliosService (from portfolios module): For Layer 2 authorization
 * 
 * Exports:
 * - HistoryService: Available for other modules (imports, portfolios) to create records
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      DebtOwnershipHistory,
      Debt, // For PortfolioSoldListener to query debts in transferred portfolio
      UserPortfolioPermission, // For HistoryService Layer 2 authorization
    ]),
  ],
  controllers: [HistoryController],
  providers: [
    HistoryService,
    PortfolioSoldListener, // Event subscriber for PortfolioSold events
  ],
  exports: [HistoryService], // Export for imports and portfolios modules
})
export class HistoryModule {}
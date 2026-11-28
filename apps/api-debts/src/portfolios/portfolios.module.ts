import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PortfoliosController } from './portfolios.controller';
import { PortfoliosService } from './portfolios.service';
import { Portfolio } from './entities/portfolio.entity';
import { UserPortfolioPermission } from './entities/user-portfolio-permission.entity';
import { Debt } from '../debts/entities/debt.entity';
import { EventsModule } from '../events/events.module';

/**
 * Portfolios Feature Module
 * 
 * Encapsulates all portfolio management functionality including:
 * - Portfolio CRUD operations
 * - Status lifecycle management
 * - User-portfolio permission assignment (Layer 2 authorization setup)
 * - Portfolio transfer between organizations
 * - Portfolio-level metrics and summaries
 * 
 * Entities:
 * - Portfolio: Main portfolio records
 * - UserPortfolioPermission: **CRITICAL** Layer 2 authorization mechanism
 * 
 * Dependencies:
 * - TypeORM for database access
 * - EventPublisher (to be added) for event-driven architecture
 * - Debt entity (from debts module) for metrics aggregation
 * 
 * Exports:
 * - PortfoliosService: Available for other modules (debts module for Layer 2 auth checks)
 * - UserPortfolioPermission entity: Available for debts module to query access
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Portfolio,
      UserPortfolioPermission,
      Debt, // For metrics aggregation queries
    ]),
    EventsModule
  ],
  controllers: [PortfoliosController],
  providers: [PortfoliosService],
  exports: [
    PortfoliosService,
    TypeOrmModule, // Export to allow other modules to access UserPortfolioPermission repository
  ],
})
export class PortfoliosModule {}
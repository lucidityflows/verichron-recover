import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditorsService } from './creditors.service';
import { CreditorResolutionService } from './creditor-resolution.service';
import { CreditorConflictsService } from './creditor-conflicts.service';
import { VertexAiEntityMatcherService } from './ai/vertex-ai-entity-matcher.service';
import { CreditorsController } from './creditors.controller';
import { CreditorConflictsController } from './creditor-conflicts.controller';
import { InternalCreditorsController } from './creditors.internal.controller';
import { InternalGlobalCreditorsController } from './global-creditors.internal.controller';
import { Creditor } from './entities/creditor.entity';
import { GlobalCreditor } from './entities/global-creditor.entity';
import { CreditorConflict } from './entities/creditor-conflict.entity';
import { Debt } from '../debts/entities/debt.entity';
import { EventsModule } from '../events/events.module';

/**
 * Creditors Feature Module (Version 2.0)
 *
 * Manages creditor master data with Global/Local architecture and
 * Vertex AI-powered entity resolution.
 *
 * **Architecture:** Global/Local Schema
 * - GlobalCreditor: Platform-owned master data (Gold List + verified entries)
 * - Creditor: Organization-owned local data (tenant-isolated)
 * - CreditorConflict: Manual review queue for borderline matches
 *
 * **Key Features:**
 * - Vertex AI Semantic Matching: Gemini Flash 1.5 for entity resolution
 * - Human-in-the-Loop: AI suggests, humans decide (no auto-merge)
 * - Four-Tier Confidence System: 95%/70%/40%/noise floor
 * - Impact-Based Escalation: Conflicts sorted by debt count affected
 * - Platform Gold List: Top 500 creditors for cross-tenant matching
 * - Temp Creditor Pattern: Non-blocking import workflow
 *
 * **Bounded Context:**
 * - Owned by: api-debts
 * - Referenced by: Debt entity (creditorId FK)
 * - Used by: Import pipeline, conflict resolution UI, analytics
 *
 * **Entities:**
 * - Creditor: Organization-owned creditor records
 * - GlobalCreditor: Platform-owned Gold List
 * - CreditorConflict: Manual review queue
 *
 * **Services:**
 * - CreditorsService: CRUD operations for creditor records
 * - CreditorResolutionService: Entity resolution with Vertex AI
 * - CreditorConflictsService: Conflict resolution workflow
 * - VertexAiEntityMatcherService: Semantic matching with Gemini Flash
 *
 * **Controllers:**
 * - CreditorsController: Public REST API for creditor management
 * - CreditorConflictsController: Public REST API for conflict resolution
 * - InternalCreditorsController: Internal analytics endpoints (HMAC auth)
 * - InternalGlobalCreditorsController: Platform admin Gold List management
 *
 * **Dependencies:**
 * - TypeORM for database access
 * - EventsModule for event publishing
 * - ConfigModule for Vertex AI configuration
 *
 * **Exports:**
 * - CreditorsService: Available for debt import and other modules
 * - CreditorResolutionService: Available for debt import entity resolution
 *
 * @see APPROVED-VERTEX-AI-IMPORT-STRATEGY.md
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Creditor,
      GlobalCreditor,
      CreditorConflict,
      Debt,
    ]),
    EventsModule,
  ],
  controllers: [
    CreditorsController,
    CreditorConflictsController,
    InternalCreditorsController,
    InternalGlobalCreditorsController,
  ],
  providers: [
    CreditorsService,
    CreditorResolutionService,
    CreditorConflictsService,
    VertexAiEntityMatcherService,
  ],
  exports: [
    CreditorsService,
    CreditorResolutionService,
  ],
})
export class CreditorsModule {}

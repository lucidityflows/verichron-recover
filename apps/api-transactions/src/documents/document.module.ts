import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DocumentsController } from './document.controller';
import { DocumentsService } from './document.service';
import { Document } from './entities/document.entity';
import { PlansModule } from '../payment-plans/payment-plan.module';
import { TransactionsModule } from '../transactions/transaction.module';

/**
 * Documents Module
 *
 * Manages payment-related document generation, storage, and retrieval.
 * Integrates with Google Cloud Storage for file storage and provides
 * PDF generation capabilities.
 *
 * Dependencies:
 * - PlansModule: For fetching payment plan data (circular dependency resolved with forwardRef)
 * - TransactionsModule: For fetching transaction data (circular dependency resolved with forwardRef)
 *
 * Exports:
 * - DocumentsService: For internal use by other modules (e.g., transactions service)
 *
 * Note: Uses forwardRef() to handle circular dependencies:
 * Plans → Transactions → Documents → Plans
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Document]),
    forwardRef(() => PlansModule),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [DocumentsController],
  providers: [DocumentsService],
  exports: [DocumentsService],
})
export class DocumentsModule {}
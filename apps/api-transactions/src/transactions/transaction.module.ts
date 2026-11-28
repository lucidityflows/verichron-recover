import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransactionsController } from './transaction.controller';
import { TransactionsService } from './transaction.service';
import { TransactionHistory } from './entities/transaction-history.entity';
import { GatewaysModule } from '../gateways/gateway.module';
import { DocumentsModule } from '../documents/document.module';
import { TransactionsInternalController } from './transactions.internal.controller';

/**
 * Transactions Module
 * 
 * Manages payment transaction processing, history, and refunds.
 * 
 * Dependencies:
 * - GatewaysModule: For payment gateway integration
 * - DocumentsModule: For generating payment receipts
 * 
 * Exports:
 * - TransactionsService: For internal use by plans module
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([TransactionHistory]),
    GatewaysModule,
    DocumentsModule,
  ],
  controllers: [TransactionsController, TransactionsInternalController],
  providers: [TransactionsService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
import { Module } from '@nestjs/common';
import { TransactionsOpsController } from './transactions.ops.controller';
import { TransactionsOpsService } from './transactions.ops.service';
import { GatewaysModule } from './gateways/gateway.module';

/**
 * Transactions Ops Module
 *
 * Encapsulates all administrative transactions logic.
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [GatewaysModule],
  controllers: [TransactionsOpsController],
  providers: [TransactionsOpsService],
  exports: [TransactionsOpsService],
})
export class TransactionsOpsModule {}

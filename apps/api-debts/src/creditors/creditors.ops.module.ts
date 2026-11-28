import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditorsOpsController } from './creditors.ops.controller';
import { CreditorsOpsService } from './creditors.ops.service';
import { Creditor } from './entities/creditor.entity';
import { GlobalCreditor } from './entities/global-creditor.entity';
import { EventsModule } from '../events/events.module';

/**
 * Creditors Ops Module
 *
 * Encapsulates all administrative creditor management logic.
 * Focuses on Global Creditor (Master List) and tenant visibility.
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Creditor,
      GlobalCreditor,
    ]),
    EventsModule,
  ],
  controllers: [CreditorsOpsController],
  providers: [CreditorsOpsService],
  exports: [CreditorsOpsService],
})
export class CreditorsOpsModule {}

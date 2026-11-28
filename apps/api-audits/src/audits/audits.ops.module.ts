import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AuditsOpsController } from './audits.ops.controller';
import { AuditsOpsService } from './audits.ops.service';

@Module({
  imports: [StorageModule],
  controllers: [AuditsOpsController],
  providers: [AuditsOpsService],
  exports: [AuditsOpsService],
})
export class AuditsOpsModule {}

import { Module } from '@nestjs/common';
import { StorageModule } from '../storage/storage.module';
import { AuditsController } from './audits.controller';
import { AuditsService } from './audits.service';

@Module({
  imports: [StorageModule],
  controllers: [AuditsController],
  providers: [AuditsService],
  exports: [AuditsService],
})
export class AuditsModule {}

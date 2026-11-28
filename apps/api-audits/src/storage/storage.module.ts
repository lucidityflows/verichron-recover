import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from './entities/audit-log.entity';
import { AuditRequest } from './entities/audit-request.entity';
import { AuditArchive } from './entities/audit-archive.entity';
import { ComplianceBrief } from './entities/compliance-brief.entity';
import { AuditHashService } from './services/audit-hash.service';
import { AuditLogWriterService } from './services/audit-log-writer.service';

@Module({
  imports: [TypeOrmModule.forFeature([AuditLog, AuditRequest, AuditArchive, ComplianceBrief])],
  providers: [AuditHashService, AuditLogWriterService],
  exports: [TypeOrmModule, AuditHashService, AuditLogWriterService],
})
export class StorageModule {}

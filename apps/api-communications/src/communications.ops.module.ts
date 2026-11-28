import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunicationsOpsController } from './communications.ops.controller';
import { CommunicationsOpsService } from './communications.ops.service';
import { Template } from './templates/entities/template.entity';
import { CommunicationLog, CommunicationLogSchema } from './logs/schemas/communication-log.schema';
import { GatewaysModule } from './gateways/gateways.module';

/**
 * Communications Ops Module
 *
 * Encapsulates all administrative communications logic (Logs, Templates).
 * Bypasses tenant-scoped security for Platform Admin use.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Template]),
    MongooseModule.forFeature([{ name: CommunicationLog.name, schema: CommunicationLogSchema }]),
    GatewaysModule,
  ],
  controllers: [CommunicationsOpsController],
  providers: [CommunicationsOpsService],
  exports: [CommunicationsOpsService],
})
export class CommunicationsOpsModule {}

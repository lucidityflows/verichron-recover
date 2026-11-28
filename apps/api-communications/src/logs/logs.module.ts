import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LogsController } from './logs.controller';
import { LogsInternalController } from './logs.internal.controller';
import { LogsService } from './logs.service';
import { CommunicationLog, CommunicationLogSchema } from './schemas/communication-log.schema';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: CommunicationLog.name, schema: CommunicationLogSchema }]),
    EventsModule,
  ],
  controllers: [LogsController, LogsInternalController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
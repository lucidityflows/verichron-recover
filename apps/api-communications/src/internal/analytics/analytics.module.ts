import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CommunicationLog, CommunicationLogSchema } from '../../logs/schemas/communication-log.schema';
import { InternalAnalyticsService } from './analytics.service';
import { InternalAnalyticsController } from './analytics.internal.controller';
import { CommunicationsInternalController } from './communications.internal.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: CommunicationLog.name, schema: CommunicationLogSchema },
    ]),
  ],
  providers: [InternalAnalyticsService],
  controllers: [InternalAnalyticsController, CommunicationsInternalController],
  exports: [InternalAnalyticsService],
})
export class InternalAnalyticsModule {}

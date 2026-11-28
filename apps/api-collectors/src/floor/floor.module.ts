import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FloorController } from './floor.controller';
import { FloorService } from './floor.service';
import { TimeTrackingSession } from '../time-tracking/entities/time-tracking-session.entity';
import { CollectorProfile } from '../profiles/entities/collector-profile.entity';
import { CollectorDailyMetric } from '../performance/entities/collector-daily-metric.entity';
import { Goal } from '../goals/entities/goal.entity';
import { CoreModule } from '../core';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TimeTrackingSession,
      CollectorProfile,
      CollectorDailyMetric,
      Goal,
    ]),
    CoreModule,
  ],
  controllers: [FloorController],
  providers: [FloorService],
  exports: [FloorService],
})
export class FloorModule {}

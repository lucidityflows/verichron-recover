import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkstationController } from './workstation.controller';
import { WorkstationInternalController } from './workstation.internal.controller';
import { WorkstationService } from './workstation.service';
import { CollectorAction } from './entities';
import { PerformanceModule } from '../performance/performance.module';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CollectorAction,
    ]),
    PerformanceModule, // Needed for response tracking if used in workstation
    EventsModule
  ],
  controllers: [WorkstationController, WorkstationInternalController],
  providers: [WorkstationService],
  exports: [WorkstationService],
})
export class WorkstationModule {}

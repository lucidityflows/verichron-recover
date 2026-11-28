import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Organization } from '../profiles/entities';
import { AnalyticsEventsController } from './analytics.events.controller';
import { DebtorProfileCreatedListener } from './listeners/debtor-profile-created.listener';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { EventsModule} from '../events/events.module';

if (!process.env.PUBSUB_PROJECT_ID) {
  throw new Error('PUBSUB_PROJECT_ID environment variable is not set.');
}

@Module({
  imports: [
    TypeOrmModule.forFeature([Organization]),
    OnboardingModule,
    EventsModule
  ],
  controllers: [AnalyticsController, AnalyticsEventsController],
  providers: [
    AnalyticsService,
    DebtorProfileCreatedListener,
  ],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}

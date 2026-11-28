import { Module, Logger } from '@nestjs/common';
import { LogsModule } from '../logs/logs.module';
import { DispatchModule } from '../dispatch/dispatch.module';
import { EventsModule } from '../events/events.module';
import { TemplatesModule } from '../templates/templates.module';
import { GatewaysModule } from '../gateways/gateways.module';
import {
  CollectorsListener,
  DebtCreatedListener,
  DebtStatusChangedListener,
  DebtorInvitationRequestedListener,
  DebtorInvitationBatchRequestedListener,
  ProfileVerificationStatusChangedListener,
  TransactionRefundIssuedListener,
  TransactionFailedListener,
  TransactionSucceededListener,
  DebtorUserCreatedListener,
  UserPasswordResetRequestedListener,
  UserCreatedListener,
} from './listeners';

@Module({
  imports: [
    LogsModule,
    DispatchModule,
    EventsModule,
    TemplatesModule,
    GatewaysModule,
  ],
  providers: [
    Logger,
    CollectorsListener,
    DebtCreatedListener,
    DebtStatusChangedListener,
    DebtorInvitationRequestedListener,
    DebtorInvitationBatchRequestedListener,
    ProfileVerificationStatusChangedListener,
    TransactionRefundIssuedListener,
    TransactionFailedListener,
    TransactionSucceededListener,
    DebtorUserCreatedListener,
    UserPasswordResetRequestedListener,
    UserCreatedListener,
  ],
})
export class NotificationsModule {}

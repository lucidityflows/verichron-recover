import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { StorageModule } from '../storage/storage.module';
import { OrganizationStatusChangedListener } from './listeners/organization-status-changed.listener';
import { OrganizationDomainEventsListener } from './listeners/organization-domain-events.listener';
import { DomainEventsListener } from './listeners/domain-events.listener';

@Module({
  imports: [EventsModule, StorageModule],
  providers: [OrganizationStatusChangedListener, OrganizationDomainEventsListener, DomainEventsListener],
})
export class IngestionModule {}

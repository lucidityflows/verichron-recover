import { TimelineEventType } from '@verichron/enums';
import { IMetadata } from './metadata.interface'; // Added

export interface IDebtorFocusTimelineEvent {
  id: string;
  timestamp: Date;
  eventType: TimelineEventType;
  title: string;
  description: string;
  performedBy: string;
  performedByName: string;
  relatedDebtId: string | null;
  metadata: IMetadata; // Changed
}

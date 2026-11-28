import { ActivityFeedType, ActivitySeverity } from "@verichron/enums";

export interface IActivityFeedItem {
  id: string;
  type: ActivityFeedType;
  severity: ActivitySeverity;
  summary: string;
  timestamp: string;
  metadata: {
    userId: string;
    userName: string;
    debtorId?: string;
    debtorName?: string;
    amount?: number;
    extra?: Record<string, any>;
  };
}

export interface IActivityFeed {
  organizationId: string;
  activities: IActivityFeedItem[];
}

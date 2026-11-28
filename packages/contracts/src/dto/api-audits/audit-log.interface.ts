import { IActorSnapshot } from './actor-snapshot.interface';
import { IChangeDelta } from './change-delta.interface';

export interface IAuditLog {
  id: string;
  organizationId: string;
  eventId: string;
  actorSnapshot: IActorSnapshot;
  action: string;
  targetType: string;
  targetId: string;
  changes?: Record<string, IChangeDelta>;
  metadata?: Record<string, any>;
  prevHash?: string;
  createdAt: Date;
}

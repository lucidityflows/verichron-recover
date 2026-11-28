/**
 * Realtime event types for WebSocket communication
 * 
 * These are the event names emitted by the RealtimeGateway
 * and consumed by the UI.
 */
export const REALTIME_EVENT_TYPES = {
  // User & Roster
  USER_STATUS_CHANGED: 'USER_STATUS_CHANGED',
  TEAM_MEMBER_ADDED: 'TEAM_MEMBER_ADDED',
  
  // Collections & Operational
  DEBT_STATUS_CHANGED: 'DEBT_STATUS_CHANGED',
  PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
  WORK_ITEM_ASSIGNED: 'WORK_ITEM_ASSIGNED',
  
  // Exceptions (Escalations)
  COMPLIANCE_BLOCKED: 'COMPLIANCE_BLOCKED',
  SETTLEMENT_REQUESTED: 'SETTLEMENT_REQUESTED',
  
  // Goals
  GOAL_PROGRESS_UPDATED: 'GOAL_PROGRESS_UPDATED',
  
  // System
  SYSTEM_NOTIFICATION: 'SYSTEM_NOTIFICATION',
} as const;

export type RealtimeEventType = typeof REALTIME_EVENT_TYPES[keyof typeof REALTIME_EVENT_TYPES];

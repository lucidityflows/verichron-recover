export interface NotificationCreatedPayload {
  notificationId: string;
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  actionLink?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

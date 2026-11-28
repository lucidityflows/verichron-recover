/**
 * Test Data: Notifications
 *
 * Creates sample notifications for collectors.
 */

import { DataSource } from 'typeorm';
import { NotificationType } from '@verichron/enums';
import { log } from '../../helpers/logger';

export async function seedNotifications(
  collectorsDataSource: DataSource,
  users: Record<string, Array<{ id: string; email: string }>>
) {
  log('  🔔 Seeding notifications...', 'cyan');

  for (const orgId of Object.keys(users)) {
    const orgUsers = users[orgId];
    
    for (const user of orgUsers) {
      if (user.email.includes('collector') || user.email.includes('manager')) {
        // Unread Notification: Compliance Alert (using MANAGER_ESCALATION)
        await createNotification(collectorsDataSource, {
          organizationId: orgId,
          userId: user.id,
          type: NotificationType.MANAGER_ESCALATION,
          title: 'Upcoming Compliance Deadline',
          message: 'Review pending FDCPA disclosures for your assigned accounts by EOD.',
          actionLink: '/compliance/review',
          isRead: false,
        });

        // Unread Notification: Work Item Assigned
        await createNotification(collectorsDataSource, {
          organizationId: orgId,
          userId: user.id,
          type: NotificationType.WORK_ITEM_ASSIGNED,
          title: 'High Priority Account Assigned',
          message: 'You have been assigned a new high-priority account: Sarah Connor ($12,450.00)',
          actionLink: '/work-queue',
          isRead: false,
        });

        // Read Notification: System Update (using PERFORMANCE_MILESTONE)
        await createNotification(collectorsDataSource, {
          organizationId: orgId,
          userId: user.id,
          type: NotificationType.PERFORMANCE_MILESTONE,
          title: 'Platform Maintenance Complete',
          message: 'The system update is complete. New filtering options are now available in the work queue.',
          actionLink: null,
          isRead: true,
        });
      }
    }
  }

  log('  ✅ Notifications seeding complete', 'green');
}

interface NotificationConfig {
  organizationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionLink: string | null;
  isRead: boolean;
}

async function createNotification(
  dataSource: DataSource,
  config: NotificationConfig
) {
  // Check if similar notification already exists to keep it idempotent
  const existing = await dataSource.query(
    `SELECT id FROM notifications WHERE user_id = $1 AND title = $2`,
    [config.userId, config.title]
  );

  if (!existing || existing.length === 0) {
    await dataSource.query(
      `INSERT INTO notifications (
        organization_id, user_id, type, title, message, action_link, is_read, read_at, created_at
      )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [
        config.organizationId, config.userId, config.type, config.title, config.message, 
        config.actionLink, config.isRead, config.isRead ? new Date() : null
      ]
    );
  }
}

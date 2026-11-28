import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Notification } from './entities';
import {
  CreateNotificationDto,
  NotificationResponseDto,
  GetNotificationsQueryDto,
  MarkNotificationReadDto,
  NotificationSummaryDto,
} from './dto';

/**
 * Notification Service
 *
 * Handles notification management for collectors:
 * - Creating notifications for important events
 * - Fetching notifications (polling-based)
 * - Marking notifications as read/unread
 * - Automatic cleanup of old notifications
 *
 * Design Pattern: Polling-based with REST endpoints
 * Future Enhancement: Upgrade to WebSocket/SSE for real-time push
 */
@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepository: Repository<Notification>,
  ) {}

  /**
   * Create a new notification
   *
   * @param dto - Notification creation data
   * @returns Created notification
   */
  async createNotification(dto: CreateNotificationDto): Promise<NotificationResponseDto> {
    this.logger.log(
      `Creating notification for user ${dto.userId}: ${dto.type}`,
    );

    const notification = this.notificationRepository.create({
      organizationId: dto.organizationId,
      userId: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      actionLink: dto.actionLink || null,
      metadata: dto.metadata || null,
      isRead: false,
      readAt: null,
    });

    const savedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`Created notification ${savedNotification.id} for user ${dto.userId}`);

    return this.mapToResponseDto(savedNotification);
  }

  /**
   * Get notifications for a user
   *
   * @param userId - User ID to fetch notifications for
   * @param organizationId - Organization ID for scoping
   * @param query - Query parameters (filters, pagination)
   * @returns List of notifications
   */
  async getNotifications(
    userId: string,
    organizationId: string,
    query: GetNotificationsQueryDto,
  ): Promise<NotificationResponseDto[]> {
    this.logger.log(`Fetching notifications for user ${userId}`);

    const queryBuilder = this.notificationRepository
      .createQueryBuilder('notification')
      .where('notification.user_id = :userId', { userId })
      .andWhere('notification.organization_id = :organizationId', { organizationId });

    // Apply filters
    if (query.isRead !== undefined) {
      queryBuilder.andWhere('notification.is_read = :isRead', { isRead: query.isRead });
    }

    if (query.type) {
      queryBuilder.andWhere('notification.type = :type', { type: query.type });
    }

    // Order by most recent first
    queryBuilder.orderBy('notification.created_at', 'DESC');

    // Apply pagination
    const pageSize = query.pageSize || 50;
    const offset = query.offset || 0;
    queryBuilder.limit(pageSize).offset(offset);

    const notifications = await queryBuilder.getMany();

    this.logger.log(`Fetched ${notifications.length} notifications for user ${userId}`);

    return notifications.map(n => this.mapToResponseDto(n));
  }

  /**
   * Get notification summary (unread count + recent notifications)
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for scoping
   * @returns Notification summary with counts
   */
  async getNotificationSummary(
    userId: string,
    organizationId: string,
  ): Promise<NotificationSummaryDto> {
    this.logger.log(`Fetching notification summary for user ${userId}`);

    // Get unread count
    const unreadCount = await this.notificationRepository.count({
      where: {
        userId,
        organizationId,
        isRead: false,
      },
    });

    // Get total count
    const totalCount = await this.notificationRepository.count({
      where: {
        userId,
        organizationId,
      },
    });

    // Get 10 most recent notifications
    const recentNotifications = await this.notificationRepository.find({
      where: {
        userId,
        organizationId,
      },
      order: {
        createdAt: 'DESC',
      },
      take: 10,
    });

    this.logger.log(
      `User ${userId} has ${unreadCount} unread notifications (${totalCount} total)`,
    );

    return {
      unreadCount,
      totalCount,
      recentNotifications: recentNotifications.map(n => this.mapToResponseDto(n)),
    };
  }

  /**
   * Mark notification as read/unread
   *
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   * @param organizationId - Organization ID for scoping
   * @param dto - Read status data
   * @returns Updated notification
   */
  async markNotificationRead(
    notificationId: string,
    userId: string,
    organizationId: string,
    dto: MarkNotificationReadDto,
  ): Promise<NotificationResponseDto> {
    this.logger.log(
      `Marking notification ${notificationId} as ${dto.isRead ? 'read' : 'unread'}`,
    );

    const notification = await this.notificationRepository.findOne({
      where: {
        id: notificationId,
        userId,
        organizationId,
      },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${notificationId} not found`);
    }

    notification.isRead = dto.isRead;
    notification.readAt = dto.isRead ? new Date() : null;

    const updatedNotification = await this.notificationRepository.save(notification);

    this.logger.log(`Updated notification ${notificationId} read status`);

    return this.mapToResponseDto(updatedNotification);
  }

  /**
   * Mark all notifications as read for a user
   *
   * @param userId - User ID
   * @param organizationId - Organization ID for scoping
   * @returns Number of notifications marked as read
   */
  async markAllNotificationsRead(
    userId: string,
    organizationId: string,
  ): Promise<number> {
    this.logger.log(`Marking all notifications as read for user ${userId}`);

    const result = await this.notificationRepository.update(
      {
        userId,
        organizationId,
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      },
    );

    const count = result.affected || 0;

    this.logger.log(`Marked ${count} notifications as read for user ${userId}`);

    return count;
  }

  /**
   * Delete old notifications (automatic cleanup)
   * Called by scheduled job to remove notifications older than 30 days
   *
   * @param daysOld - Age threshold in days (default: 30)
   * @returns Number of notifications deleted
   */
  async deleteOldNotifications(daysOld = 30): Promise<number> {
    this.logger.log(`Deleting notifications older than ${daysOld} days`);

    const threshold = new Date();
    threshold.setDate(threshold.getDate() - daysOld);

    const result = await this.notificationRepository.delete({
      createdAt: LessThan(threshold),
    });

    const count = result.affected || 0;

    this.logger.log(`Deleted ${count} old notifications`);

    return count;
  }

  /**
   * Helper method to map entity to response DTO
   */
  private mapToResponseDto(notification: Notification): NotificationResponseDto {
    return {
      id: notification.id,
      organizationId: notification.organizationId,
      userId: notification.userId,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      actionLink: notification.actionLink || undefined,
      isRead: notification.isRead,
      readAt: notification.readAt ? notification.readAt.toISOString() : undefined,
      metadata: notification.metadata || undefined,
      createdAt: notification.createdAt.toISOString(),
    };
  }
}

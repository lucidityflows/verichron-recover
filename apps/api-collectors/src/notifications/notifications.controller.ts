import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { NotificationService } from './notifications.service';
import {
  NotificationResponseDto,
  GetNotificationsQueryDto,
  MarkNotificationReadDto,
  NotificationSummaryDto,
} from './dto';
import { JwtAuthGuard, CurrentUserId } from '@verichron/auth';

/**
 * Notification Controller
 *
 * Endpoints for collector notification management:
 * - Fetching notifications (polling-based)
 * - Marking notifications as read
 * - Getting unread count
 *
 * Future Enhancement: Upgrade to WebSocket/SSE for real-time push
 */
@ApiTags('Notifications')
@Controller('collectors/notifications/orgs/:organizationId')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get('summary')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notification summary',
    description: `
      Returns a summary of notifications for the current user.

      Provides:
      - Unread notification count (for badge display)
      - Total notification count
      - 10 most recent notifications

      Use Cases:
      - Display notification badge count
      - Show notification dropdown preview
      - Poll for new notifications (recommended: every 30-60 seconds)

      Permissions:
      - User can only see their own notifications
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification summary retrieved successfully',
    type: NotificationSummaryDto,
  })
  async getNotificationSummary(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
  ): Promise<NotificationSummaryDto> {
    return this.notificationService.getNotificationSummary(userId, orgId);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get notifications',
    description: `
      Fetches notifications for the current user with optional filters and pagination.

      Query Parameters:
      - isRead: Filter by read status (true/false)
      - type: Filter by notification type
      - limit: Max results (1-100, default 50)
      - offset: Pagination offset (default 0)

      Returns notifications ordered by most recent first.

      Use Cases:
      - Display notification list in UI
      - Fetch unread notifications only
      - Implement pagination for large notification lists

      Permissions:
      - User can only see their own notifications
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'Notifications retrieved successfully',
    type: [NotificationResponseDto],
  })
  async getNotifications(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
    @Query() query: GetNotificationsQueryDto,
  ): Promise<NotificationResponseDto[]> {
    return this.notificationService.getNotifications(userId, orgId, query);
  }

  @Patch(':notificationId/read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark notification as read/unread',
    description: `
      Updates the read status of a specific notification.

      Use Cases:
      - User clicks notification, mark as read
      - User marks notification as unread for follow-up
      - Decrement badge count when read

      Permissions:
      - User can only update their own notifications
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiParam({ name: 'notificationId', type: 'string', format: 'uuid', description: 'The notification ID' })
  @ApiResponse({
    status: 200,
    description: 'Notification read status updated successfully',
    type: NotificationResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  async markNotificationRead(
    @Param('organizationId') orgId: string,
    @Param('notificationId', ParseUUIDPipe) notificationId: string,
    @CurrentUserId() userId: string,
    @Body() dto: MarkNotificationReadDto,
  ): Promise<NotificationResponseDto> {
    return this.notificationService.markNotificationRead(
      notificationId,
      userId,
      orgId,
      dto,
    );
  }

  @Patch('mark-all-read')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Mark all notifications as read',
    description: `
      Marks all unread notifications as read for the current user.

      Use Cases:
      - "Mark all as read" button
      - Clear notification badge
      - Bulk notification management

      Returns the number of notifications marked as read.

      Permissions:
      - User can only update their own notifications
    `,
  })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid', description: 'The organization ID' })
  @ApiResponse({
    status: 200,
    description: 'All notifications marked as read',
    schema: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          example: 5,
          description: 'Number of notifications marked as read',
        },
      },
    },
  })
  async markAllNotificationsRead(
    @Param('organizationId') orgId: string,
    @CurrentUserId() userId: string,
  ): Promise<{ count: number }> {
    const count = await this.notificationService.markAllNotificationsRead(userId, orgId);
    return { count };
  }
}

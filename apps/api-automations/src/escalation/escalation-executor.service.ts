import { Injectable, Logger } from '@nestjs/common';
import { EventPublisher } from '@verichron/event-publisher';
import { EVENT_TYPES } from '@verichron/events';
import { SendEmailCommandDto, SendNotificationCommandDto } from '../events/event-dto';
import type { ExecuteEscalationPayload } from '@verichron/events';
import { EscalationNotificationMethod } from '@verichron/enums';
import { ConditionEvaluator } from '../common/helpers';

export interface EscalationResult {
  success: boolean;
  ruleId: string;
  targetEntityId: string;
  notificationsSent: string[]; // Methods used (EMAIL, SMS, IN_APP)
  reason?: string;
  error?: string;
}

@Injectable()
export class EscalationExecutorService {
  private readonly logger = new Logger(EscalationExecutorService.name);

  constructor(private readonly eventPublisher: EventPublisher) {}

  /**
   * Main method to execute an escalation for a target entity
   *
   * @param payload - Command payload from api-workflows
   * @returns EscalationResult indicating success or failure
   */
  async executeEscalation(payload: ExecuteEscalationPayload): Promise<EscalationResult> {
    const { targetEntityId, targetEntityType, targetEntityData = {} } = payload;

    this.logger.debug(
      `Executing escalation rule "${payload.ruleName}" (${payload.ruleId}) for ${targetEntityType} ${targetEntityId}`
    );

    try {
      // Step 1: Evaluate trigger conditions
      const conditionsMet = ConditionEvaluator.checkConditions(
        payload.triggerConditions,
        targetEntityData
      );

      if (!conditionsMet) {
        this.logger.warn(
          `Escalation conditions not met for rule "${payload.ruleName}" on ${targetEntityType} ${targetEntityId}`
        );
        return {
          success: false,
          ruleId: payload.ruleId,
          targetEntityId,
          notificationsSent: [],
          reason: 'Escalation conditions not met',
        };
      }

      // Step 2: Send notifications via specified methods
      const notificationsSent: string[] = [];

      for (const method of payload.notificationMethods) {
        try {
          switch (method) {
            case EscalationNotificationMethod.EMAIL:
              await this.sendEmailNotification(payload);
              notificationsSent.push(method);
              break;

            case EscalationNotificationMethod.SMS:
              await this.sendSMSNotification(payload);
              notificationsSent.push(method);
              break;

            case EscalationNotificationMethod.IN_APP:
              await this.sendInAppNotification(payload);
              notificationsSent.push(method);
              break;

            default:
              this.logger.warn(`Unknown notification method: ${method}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          this.logger.error(
            `Failed to send ${method} notification for escalation "${payload.ruleName}": ${errorMessage}`
          );
          // Continue with other notification methods
        }
      }

      if (notificationsSent.length === 0) {
        this.logger.error(`No notifications sent for escalation "${payload.ruleName}"`);
        return {
          success: false,
          ruleId: payload.ruleId,
          targetEntityId,
          notificationsSent: [],
          error: 'Failed to send any notifications',
        };
      }

      this.logger.log(
        `Successfully executed escalation "${payload.ruleName}" for ${targetEntityType} ${targetEntityId}. Sent: ${notificationsSent.join(', ')}`
      );

      return {
        success: true,
        ruleId: payload.ruleId,
        targetEntityId,
        notificationsSent,
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Error executing escalation for ${targetEntityType} ${targetEntityId}: ${errorMessage}`
      );

      return {
        success: false,
        ruleId: payload.ruleId,
        targetEntityId,
        notificationsSent: [],
        error: errorMessage,
      };
    }
  }

  /**
   * Send email notification to escalation targets
   */
  private async sendEmailNotification(payload: ExecuteEscalationPayload): Promise<void> {
    const emailSubject = `[${payload.priority}] Escalation Alert: ${payload.ruleName}`;
    const emailBody = this.buildEmailBody(payload);

    for (const targetUserId of payload.escalationTargets) {
      await this.eventPublisher.publish(
        EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL,
        {
          organizationId: payload.organizationId,
          recipient: targetUserId, // Updated to match DTO field 'recipient'
          templateId: 'escalation-alert', // Standard template ID
          context: {
            subject: emailSubject,
            body: emailBody,
            priority: payload.priority,
            escalationRuleId: payload.ruleId,
            escalationRuleName: payload.ruleName,
            targetEntityId: payload.targetEntityId,
            targetEntityType: payload.targetEntityType,
          },
          targetEntityId: payload.targetEntityId,
          targetEntityType: payload.targetEntityType as any,
        },
        SendEmailCommandDto,
        { correlationId: payload.correlationId }
      );
    }

    this.logger.debug(
      `Email notifications queued for ${payload.escalationTargets.length} recipients`
    );
  }

  /**
   * Send SMS notification to escalation targets
   */
  private async sendSMSNotification(payload: ExecuteEscalationPayload): Promise<void> {
    const smsMessage = this.buildSMSMessage(payload);

    for (const targetUserId of payload.escalationTargets) {
      await this.eventPublisher.publish(
        EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_EMAIL, // TODO: Update to SMS event when available
        {
          organizationId: payload.organizationId,
          recipient: targetUserId,
          templateId: 'escalation-sms',
          context: {
            message: smsMessage,
            priority: payload.priority,
            escalationRuleId: payload.ruleId,
            escalationRuleName: payload.ruleName,
            targetEntityId: payload.targetEntityId,
            targetEntityType: payload.targetEntityType,
          },
          targetEntityId: payload.targetEntityId,
          targetEntityType: payload.targetEntityType as any,
        },
        SendEmailCommandDto,
        { correlationId: payload.correlationId }
      );
    }

    this.logger.debug(
      `SMS notifications queued for ${payload.escalationTargets.length} recipients`
    );
  }

  /**
   * Send in-app notification to escalation targets
   */
  private async sendInAppNotification(payload: ExecuteEscalationPayload): Promise<void> {
    const notificationMessage = this.buildInAppNotificationMessage(payload);

    for (const targetUserId of payload.escalationTargets) {
      await this.eventPublisher.publish(
        EVENT_TYPES.COMMUNICATIONS_WORKFLOW_COMMAND_SEND_NOTIFICATION,
        {
          organizationId: payload.organizationId,
          userId: targetUserId,
          message: notificationMessage,
          notificationType: 'WARNING',
          targetEntityId: payload.targetEntityId,
          targetEntityType: payload.targetEntityType as any,
          actionUrl: `/app/${payload.targetEntityType.toLowerCase()}s/${payload.targetEntityId}`,
        },
        SendNotificationCommandDto,
        { correlationId: payload.correlationId }
      );
    }

    this.logger.debug(
      `In-app notifications queued for ${payload.escalationTargets.length} recipients`
    );
  }

  /**
   * Build email body content
   */
  private buildEmailBody(payload: ExecuteEscalationPayload): string {
    const entityName = payload.targetEntityData?.name || payload.targetEntityId;
    const entityType = payload.targetEntityType;

    return `
<html>
<body>
  <h2>Escalation Alert: ${payload.ruleName}</h2>
  <p><strong>Priority:</strong> ${payload.priority}</p>
  <p><strong>Entity:</strong> ${entityType} - ${entityName}</p>
  <p><strong>Escalate To:</strong> ${payload.escalateTo}</p>

  <h3>Details</h3>
  <ul>
    ${Object.entries(payload.targetEntityData || {})
      .map(([key, value]) => `<li><strong>${key}:</strong> ${value}</li>`)
      .join('\n    ')}
  </ul>

  <p>
    <a href="${process.env.VITE_DASHBOARD_COLLECTORS_URL || 'http://localhost:5176'}/app/${entityType.toLowerCase()}s/${payload.targetEntityId}">
      View ${entityType}
    </a>
  </p>
</body>
</html>
    `.trim();
  }

  /**
   * Build SMS message content (limited to 160 characters)
   */
  private buildSMSMessage(payload: ExecuteEscalationPayload): string {
    const entityName = payload.targetEntityData?.name || payload.targetEntityId;
    return `[${payload.priority}] Escalation: ${payload.ruleName}. ${payload.targetEntityType}: ${entityName}`;
  }

  /**
   * Build in-app notification message
   */
  private buildInAppNotificationMessage(payload: ExecuteEscalationPayload): string {
    const entityName = payload.targetEntityData?.name || payload.targetEntityId;
    return `Escalation triggered for ${payload.targetEntityType}: ${entityName}. Escalate to: ${payload.escalateTo}`;
  }
}
